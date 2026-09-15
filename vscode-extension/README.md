# StellarClassic Pulse Explorer

Browse, test, and inspect [StellarClassic Pulse](https://github.com/stellarclassic-pulse/stellarclassic-pulse) API endpoints directly from VS Code.

## Features

- **API Explorer** — sidebar tree of all endpoints grouped by category (Events, Contracts, Subscriptions, Admin, …)
- **Request Tester** — send real HTTP requests with path params, query params, custom headers, and a body editor
- **Response Viewer** — formatted JSON body, status badge, duration, and response headers

## Getting Started

1. Install the extension.
2. Open **Settings** (`Ctrl+,`) and search for `stellarclassicpulse`:
   - Set `stellarclassicpulse.baseUrl` to your running instance (default: `http://localhost:3000`)
   - Set `stellarclassicpulse.apiKey` for authenticated endpoints
   - Optionally set `stellarclassicpulse.adminApiKey` for `/admin/*` endpoints
3. Click the **⚡** icon in the activity bar to open the API Explorer.
4. Click any endpoint to open it in the Request Tester — fill in parameters and hit **Send**.

## Commands

| Command | Description |
|---------|-------------|
| `StellarClassic Pulse: Open Settings` | Jump to extension settings |
| Refresh (toolbar) | Reload the endpoint list |
| Copy URL (right-click) | Copy the full endpoint URL to clipboard |

## Publishing

```bash
cd vscode-extension
npm install
npm run package        # builds stellarclassic-pulse-explorer-x.x.x.vsix
npm run publish        # publishes to VS Code Marketplace (requires vsce login)
```

## Requirements

- VS Code `^1.85.0`
- A running StellarClassic Pulse server

## Contributing

This extension is part of the [StellarClassic Pulse](https://github.com/QingQosh/stellarclassic-pulse-clients) project.
Contributions are welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
