# StellarClassic Pulse Clients 🛠️

# StellarClassicPulse Clients

Client-side tooling for StellarClassicPulse — the dashboard UI, CLI, multi-language SDKs, and VS Code extension.

All components here talk to a running **[stellarclassicpulse-backend](../stellarclassicpulse-backend)** over HTTP.

## What's in here

| Path | Language / Stack | Purpose |
|---|---|---|
| `dashboard/` | React 18 + TypeScript + Vite | Web dashboard for browsing events, metrics, and subscriptions |
| `cli/` | Rust (standalone crate) | `spulse` command-line client |
| `sdk/javascript/` | JavaScript / TypeScript | JS/TS SDK (npm package) |
| `sdk/typescript/` | TypeScript | TypeScript SDK |
| `sdk/python/` | Python | Python SDK |
| `sdk/go/` | Go | Go SDK |
| `vscode-extension/` | TypeScript / Node | VS Code extension |
| `docs/` | Markdown / diagrams | Architecture docs, ADRs, alert rules, Grafana dashboards |
| `scripts/` | Shell | Utility and deployment scripts |
| `training/` | Mixed | ML model training scripts |

## Related repo

The Rust backend that these clients connect to lives in **[stellarclassicpulse-backend](../stellarclassicpulse-backend)**.
Start it first before running any of the clients.

## Dashboard

```bash
cd dashboard
npm install
npm run dev          # development server (connects to backend at http://localhost:3000)
npm run build        # production build → dist/
```

## CLI (`spulse`)

The CLI is a self-contained Rust project with its own `Cargo.toml`.

```bash
cd cli
cargo build --release
./target/release/spulse --help
```

Point it at the backend:

```bash
spulse --url http://localhost:3000 events list
```

## SDKs

### JavaScript / TypeScript

```bash
cd sdk/javascript   # or sdk/typescript
npm install
npm run build
```

### Python

```bash
cd sdk/python
pip install -e .
```

### Go

```bash
cd sdk/go
go build ./...
```

## VS Code Extension

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Environment variables

Copy `.env.example` and set `SOROBAN_PULSE_API_URL` to point at your backend instance.
