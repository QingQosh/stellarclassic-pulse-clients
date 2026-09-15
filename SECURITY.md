# Security Policy

## Supported Versions

| Component | Supported |
|-----------|-----------|
| `dashboard/` (latest) | ✅ Active |
| `cli/` (latest) | ✅ Active |
| `sdk/*` (latest) | ✅ Active |
| `vscode-extension/` (latest) | ✅ Active |
| Older releases | ❌ No support |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing **security@stellarclassic-pulse.io** with:

1. A clear description of the vulnerability
2. Steps to reproduce
3. Potential impact assessment
4. Any suggested mitigations (optional)

You will receive an acknowledgement within **48 hours** and a full response
within **7 days** outlining next steps.

## Disclosure Policy

- We follow responsible disclosure. Please give us **90 days** to patch before
  public disclosure.
- We will credit reporters in the release notes unless you prefer anonymity.
- We do not operate a bug bounty program at this time.

## Scope

The following are in scope:

- API key handling in `cli/` and `sdk/*`
- Webhook signature verification in client SDKs
- Authentication flows in `dashboard/`
- VS Code extension credential storage (`vscode-extension/`)

Out of scope:

- Third-party dependencies (report to the upstream maintainer)
- The backend service itself (see `stellarclassic-pulse-backend` SECURITY.md)

## Contact

**Email:** security@stellarclassic-pulse.io
**PGP:** Available on request.
