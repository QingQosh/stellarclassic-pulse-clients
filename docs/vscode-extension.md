# StellarClassic Pulse VSCode Extension

_Issue #963_

The extension (`vscode-extension/`, published as **StellarClassic Pulse Explorer**)
lets you browse, test, and inspect StellarClassic Pulse API endpoints without
leaving the editor. See [`vscode-extension/README.md`](../vscode-extension/README.md)
for the endpoint explorer and request tester basics. This page covers the
pieces added to round it out: secure API key storage and a webhook test
command.

## API key management

Previously the only place to configure an API key was the plaintext
`stellarclassicpulse.apiKey` setting — readable by anything with filesystem
access, and synced in cleartext if Settings Sync is enabled. Two commands
now store keys in VS Code's `SecretStorage` (backed by the OS keychain)
instead:

| Command | Effect |
|---|---|
| **StellarClassic Pulse: Set API Key** | Prompts (masked input) and stores the `x-api-key` value securely. |
| **StellarClassic Pulse: Set Admin API Key** | Same, for the admin key used on `/admin/*` endpoints. |
| **StellarClassic Pulse: Clear Stored API Keys** | Removes both from secure storage. |

Run any of these from the Command Palette (`Cmd/Ctrl+Shift+P`). The
Request Tester reads from secure storage first and falls back to the
`stellarclassicpulse.apiKey` / `stellarclassicpulse.adminApiKey` settings only if nothing
has been saved that way — existing configs keep working, but new users
should prefer the commands. See `src/apiKeyManager.ts`.

## Testing a webhook

**StellarClassic Pulse: Test Webhook** (also available as the radio-tower icon in
the API Explorer's title bar) sends a synthetic event payload directly to a
URL you provide — the same shape a real subscription delivery uses,
flagged with `test_delivery: true` and an `x-stellarclassic-pulse-test: true`
header — so you can confirm a receiver is reachable before wiring up a live
subscription. This mirrors `spulse webhook-test` in the CLI
(see [`cli-usage.md`](cli-usage.md)).

1. Run the command, enter the callback URL (validated as an absolute URL)
   and, optionally, a contract ID to embed in the sample event.
2. The request is sent with the configured request timeout
   (`stellarclassicpulse.timeoutMs`).
3. Status, latency, and the response body appear in a notification and in
   the **StellarClassic Pulse** output channel.

This talks directly to the URL you give it — it does not go through the
configured `stellarclassicpulse.baseUrl` and does not require an API key.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `stellarclassicpulse.baseUrl` | `http://localhost:3000` | API server base URL used by the explorer and request tester. |
| `stellarclassicpulse.apiKey` | `""` | Legacy fallback — prefer **Set API Key**. |
| `stellarclassicpulse.adminApiKey` | `""` | Legacy fallback — prefer **Set Admin API Key**. |
| `stellarclassicpulse.timeoutMs` | `10000` | Request timeout for both the Request Tester and Test Webhook. |
