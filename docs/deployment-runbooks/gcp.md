# GCP Deployment Runbook (Compute Engine + Cloud SQL + Load Balancing)

Deploys StellarClassicPulse as a Docker container on a self-managed **Compute
Engine** VM, backed by **Cloud SQL for PostgreSQL** over a private IP, and
fronted by a **Cloud Load Balancing** HTTPS load balancer with a
Google-managed TLS certificate. This is the infrastructure-level alternative
to the managed [Cloud Run guide](../deployment-platforms.md#2-google-cloud-run)
— use this runbook when you need a persistent VM (custom OS packages, local
disk, long-lived background processes) rather than a scale-to-zero serverless
container.

This repo's `terraform/` directory only contains AWS modules — there is no
GCP Terraform here, so every step below uses the `gcloud` CLI directly.

## Prerequisites

- **Accounts** — a GCP project with billing enabled.
- **CLI tools** — `gcloud` CLI (`gcloud version`), `docker`, `psql` for
  verification. Install the Cloud SQL Auth Proxy on the VM (`cloud-sql-proxy`,
  bundled in the Compute Engine startup script below).
- **Credentials** — `gcloud auth login` plus `gcloud config set project
  PROJECT_ID`. The VM authenticates to Cloud SQL using its attached service
  account (no key files needed).
- **DNS** — a domain/subdomain you control, to point an `A` record at the load
  balancer's static IP and to issue the Google-managed certificate against.
- **Repository assets used by this runbook**:
  - Root [`Dockerfile`](../../Dockerfile) — builds the `stellarclassic-pulse` image.
  - [`.env.example`](../../.env.example) — full environment variable reference.

## Architecture

```
                              Internet
                                 │
                    Google-managed cert (TLS)
                                 │
                     ┌───────────────────────┐
                     │  External HTTPS LB     │
                     │  (global, static IP)   │
                     └───────────┬────────────┘
                                 │ HTTP:3000 (health check GET /healthz/ready)
                     ┌───────────▼────────────┐
                     │  Compute Engine VM      │   no public IP
                     │  docker run stellarclassic-pulse│
                     │  + cloud-sql-proxy      │
                     └───────────┬────────────┘
                                 │ Auth Proxy (127.0.0.1:5432 → private IP)
                     ┌───────────▼────────────┐
                     │  Cloud SQL PostgreSQL 16│
                     │  (private IP only)      │
                     └─────────────────────────┘
```

- The load balancer is the only internet-facing component; it terminates TLS
  with a Google-managed certificate and forwards to an unmanaged instance
  group backend on port 3000. See
  [docs/deployment.md § TLS Termination](../deployment.md#tls-termination) for
  the general comparison of TLS termination options.
- The VM has **no external IP** — it reaches the internet (Soroban RPC,
  package installs) via Cloud NAT, and reaches Cloud SQL over its **private
  IP** through the Cloud SQL Auth Proxy running alongside the app container.
- Firewall rules allow the load balancer's health-check IP ranges in on 3000
  and deny everything else.

## Deployment Steps

### 1. Enable required APIs and set defaults

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
ZONE=us-central1-a

gcloud services enable compute.googleapis.com sqladmin.googleapis.com \
  servicenetworking.googleapis.com
```

### 2. Build and push the image to Artifact Registry

```bash
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/stellarclassic-pulse/app"

gcloud artifacts repositories create stellarclassic-pulse \
  --repository-format=docker --location="$REGION" || true

docker build -t "$IMAGE:latest" .
docker push "$IMAGE:latest"
```

### 3. Create Cloud SQL for PostgreSQL with a private IP

```bash
# One-time: allocate a private services range for Cloud SQL peering
gcloud compute addresses create google-managed-services-default \
  --global --purpose=VPC_PEERING --prefix-length=16 --network=default

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default

gcloud sql instances create stellarclassic-pulse-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-4096 \
  --region="$REGION" \
  --network=default \
  --no-assign-ip \
  --storage-size=20 \
  --storage-type=SSD \
  --backup-start-time=03:00

gcloud sql databases create stellarclassic_pulse --instance=stellarclassic-pulse-db
gcloud sql users set-password postgres --instance=stellarclassic-pulse-db \
  --password="CHANGE_ME"
```

`db-custom-2-4096` (2 vCPU / 4 GiB) is a reasonable starting point for
production; `db-f1-micro` is sufficient for staging/dev only.

### 4. Create the firewall rule

```bash
gcloud compute firewall-rules create allow-lb-to-stellarclassic-pulse \
  --network=default \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:3000 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16 \
  --target-tags=stellarclassic-pulse
```

`130.211.0.0/22` and `35.191.0.0/16` are Google's documented health-check and
load-balancer source ranges — do **not** open 3000 to `0.0.0.0/0`.

### 5. Create the VM with a startup script

`e2-medium` (2 vCPU / 4 GiB) comfortably runs the app container plus the
Cloud SQL Auth Proxy; use `e2-small` for light/staging workloads.

```bash
CONNECTION_NAME=$(gcloud sql instances describe stellarclassic-pulse-db \
  --format="value(connectionName)")

cat > startup-script.sh <<EOF
#!/bin/bash
set -euxo pipefail
apt-get update && apt-get install -y docker.io
systemctl enable --now docker

curl -o /usr/local/bin/cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
chmod +x /usr/local/bin/cloud-sql-proxy
nohup /usr/local/bin/cloud-sql-proxy --private-ip ${CONNECTION_NAME} --port 5432 &

docker pull ${IMAGE}:latest

cat > /etc/stellarclassic-pulse.env <<ENV
DATABASE_URL=postgres://postgres:CHANGE_ME@127.0.0.1:5432/stellarclassic_pulse
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
PORT=3000
RUST_LOG=info
RUST_LOG_FORMAT=json
DB_MAX_CONNECTIONS=10
RATE_LIMIT_PER_MINUTE=60
START_LEDGER=0
ENV

docker run -d --name stellarclassic-pulse --restart unless-stopped \
  --network host --env-file /etc/stellarclassic-pulse.env \
  ${IMAGE}:latest
EOF

gcloud compute instances create stellarclassic-pulse-app \
  --zone="$ZONE" \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --no-address \
  --tags=stellarclassic-pulse \
  --scopes=cloud-platform \
  --metadata-from-file=startup-script=startup-script.sh
```

> Prefer the Cloud SQL secret in Secret Manager over the inline password
> above for production: `gcloud secrets create stellarclassic-pulse-db-password
> --data-file=- <<< "$PASSWORD"`, then fetch it in the startup script with
> `gcloud secrets versions access latest --secret=stellarclassic-pulse-db-password`.

### 6. Create an unmanaged instance group and HTTPS load balancer

```bash
gcloud compute instance-groups unmanaged create stellarclassic-pulse-ig --zone="$ZONE"
gcloud compute instance-groups unmanaged add-instances stellarclassic-pulse-ig \
  --zone="$ZONE" --instances=stellarclassic-pulse-app

gcloud compute health-checks create http stellarclassic-pulse-hc \
  --port=3000 --request-path=/healthz/ready \
  --check-interval=10s --timeout=5s --healthy-threshold=2 --unhealthy-threshold=3

gcloud compute backend-services create stellarclassic-pulse-backend \
  --global --protocol=HTTP --port-name=http \
  --health-checks=stellarclassic-pulse-hc

gcloud compute backend-services add-backend stellarclassic-pulse-backend \
  --global --instance-group=stellarclassic-pulse-ig --instance-group-zone="$ZONE"

gcloud compute url-maps create stellarclassic-pulse-lb \
  --default-service=stellarclassic-pulse-backend

gcloud compute addresses create stellarclassic-pulse-ip --global

gcloud compute managed-ssl-certificates create stellarclassic-pulse-cert \
  --domains=pulse.example.com

gcloud compute target-https-proxies create stellarclassic-pulse-https-proxy \
  --url-map=stellarclassic-pulse-lb --ssl-certificates=stellarclassic-pulse-cert

gcloud compute forwarding-rules create stellarclassic-pulse-https-rule \
  --global --target-https-proxy=stellarclassic-pulse-https-proxy \
  --address=stellarclassic-pulse-ip --ports=443
```

Point your DNS `A` record for `pulse.example.com` at the address printed by:

```bash
gcloud compute addresses describe stellarclassic-pulse-ip --global --format="value(address)"
```

The managed certificate stays `PROVISIONING` until DNS resolves and Google
validates it (can take up to ~60 minutes).

## Verification

```bash
LB_IP=$(gcloud compute addresses describe stellarclassic-pulse-ip --global --format="value(address)")

# 1. Certificate is ACTIVE
gcloud compute managed-ssl-certificates describe stellarclassic-pulse-cert \
  --format="value(managed.status)"

# 2. Backend is healthy
gcloud compute backend-services get-health stellarclassic-pulse-backend --global

# 3. Health endpoint through the load balancer
curl -sf "https://pulse.example.com/healthz/ready" | jq .
curl -sf "https://pulse.example.com/healthz/live"

# 4. Smoke-test a real API endpoint
curl -sf "https://pulse.example.com/v1/events?limit=1" | jq .

# 5. Cloud SQL Auth Proxy connectivity (from the VM)
gcloud compute ssh stellarclassic-pulse-app --zone="$ZONE" \
  --command 'psql "postgres://postgres:CHANGE_ME@127.0.0.1:5432/stellarclassic_pulse" -c "SELECT 1;"'

# 6. Indexer progress
curl -sf "https://pulse.example.com/metrics" | grep stellarclassic_pulse_indexer_current_ledger
```

## Rollback

- **Bad app deploy**: SSH to the VM, pull the previous tag, and restart:
  ```bash
  gcloud compute ssh stellarclassic-pulse-app --zone="$ZONE" --command \
    "docker pull ${IMAGE}:<previous-tag> && docker stop stellarclassic-pulse && docker rm stellarclassic-pulse && \
     docker run -d --name stellarclassic-pulse --restart unless-stopped --network host \
     --env-file /etc/stellarclassic-pulse.env ${IMAGE}:<previous-tag>"
  ```
  For zero-downtime, create a second instance from the previous image, add it
  to `stellarclassic-pulse-ig`, confirm it's healthy, then remove the bad one.
- **Bad DB migration**: StellarClassicPulse applies migrations automatically on
  startup — follow
  [docs/deployment.md § Migration Strategy](../deployment.md#migration-strategy)
  before rolling the app back so the old binary isn't pointed at a newer
  schema.
- **Abandoning the deployment**: delete resources in reverse order —
  forwarding rule, target proxy, URL map, backend service, health check,
  instance group, VM, Cloud SQL instance, firewall rule
  (`gcloud compute forwarding-rules delete ...`, etc.). Export a Cloud SQL
  backup first if data must be retained (`gcloud sql export sql`).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend service shows `UNHEALTHY` | Firewall doesn't allow the health-check ranges on 3000, or app not listening | `gcloud compute backend-services get-health stellarclassic-pulse-backend --global`; verify the firewall rule's `--source-ranges` are exactly `130.211.0.0/22,35.191.0.0/16` |
| `502`/`503` from the load balancer | App container crashed or startup script failed | `gcloud compute ssh stellarclassic-pulse-app --command "docker logs stellarclassic-pulse --tail 100"`; check `journalctl -u google-startup-scripts` for startup-script errors |
| App logs `connection refused` to `127.0.0.1:5432` | `cloud-sql-proxy` isn't running or crashed | `gcloud compute ssh stellarclassic-pulse-app --command "pgrep -fa cloud-sql-proxy"`; check its stdout in `journalctl` — a common cause is the VM's service account missing `roles/cloudsql.client` |
| `cloud-sql-proxy` exits with an auth/IAM error | VM's attached service account lacks Cloud SQL permissions | `gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$(gcloud compute instances describe stellarclassic-pulse-app --zone=$ZONE --format='value(serviceAccounts[0].email)')" --role="roles/cloudsql.client"` |
| Managed certificate stuck in `PROVISIONING` | DNS `A` record doesn't point at the LB IP yet, or hasn't propagated | `dig +short pulse.example.com`; confirm it matches `gcloud compute addresses describe stellarclassic-pulse-ip --global` |
| High connection count on Cloud SQL | `DB_MAX_CONNECTIONS` too high for the tier, or a leak | See [docs/runbooks/db-pool-exhaustion.md](../runbooks/db-pool-exhaustion.md); `db-custom-2-4096` allows ~100 connections by default (`max_connections` flag) |

For anything beyond the deployment itself (indexer lag, RPC errors, webhook
failures once the service is live), use
[docs/runbooks/operator-runbook.md](../runbooks/operator-runbook.md).

### Cost note

`e2-medium` (~$25/mo) + `db-custom-2-4096` Cloud SQL (~$70/mo) + external
HTTPS LB (~$18/mo + data processing) ≈ **$115/mo**, comparable to the AWS
EC2 runbook and above the [Cloud Run estimate](../deployment-platforms.md#cost-estimate-us-central1-2026)
since you're paying for an always-on VM instead of metered request time.
