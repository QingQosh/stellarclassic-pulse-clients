# Python SDK

The official Python SDK lives in `sdk/python/` and provides a typed client
for the StellarClassicPulse REST API, an async client, event-stream subscriptions,
and webhook signature verification.

## Installation

```bash
pip install -e sdk/python              # local development
pip install -e "sdk/python[async]"     # include aiohttp for AsyncStellarClassicPulseClient
```

## Quick start

```python
from stellarclassic_pulse import StellarClassicPulseClient

client = StellarClassicPulseClient(api_key="sp_live_...")

for event in client.iter_events(contract_id="CABC123", limit=50):
    print(event["id"], event["event_type"])
```

## Async usage

```python
import asyncio
from stellarclassic_pulse import AsyncStellarClassicPulseClient

async def main():
    async with AsyncStellarClassicPulseClient(api_key="sp_live_...") as client:
        async for event in client.iter_events(contract_id="CABC123"):
            print(event)

asyncio.run(main())
```

## Event subscriptions (SSE)

```python
from stellarclassic_pulse import StellarClassicPulseClient, EventSubscription

client = StellarClassicPulseClient(api_key="sp_live_...")
sub = EventSubscription(client, contract_id="CABC123", event_types=["transfer"])
sub.on_event(lambda evt: print(evt.event_type, evt.data))
sub.run()  # blocking, reconnects with exponential backoff
```

## Webhook verification

```python
from stellarclassic_pulse import verify_webhook_signature, WebhookVerificationError

try:
    verify_webhook_signature(request_body_bytes, signature_header, webhook_secret)
except WebhookVerificationError:
    # reject the request
    ...
```

See `sdk/python/examples/webhook_flask_example.py` for a full Flask
integration.

## Type hints

All public functions and methods are fully type-hinted (`from __future__
import annotations` + standard `typing` generics) so IDEs and `mypy` get
accurate signatures out of the box.

## Examples

- `sdk/python/examples/list_events.py` — basic sync polling.
- `sdk/python/examples/async_example.py` — async iteration + creating a
  subscription.
- `sdk/python/examples/webhook_flask_example.py` — verifying webhooks in a
  Flask app.

## Testing

```bash
cd sdk/python
pip install -e ".[dev]"
pytest
```

Tests cover webhook signature verification (valid/invalid/expired/tampered)
and client construction/header behavior. See `sdk/python/tests/`.

## API surface

| Module | Purpose |
|---|---|
| `stellarclassic_pulse.client.StellarClassicPulseClient` | Synchronous REST client |
| `stellarclassic_pulse.async_client.AsyncStellarClassicPulseClient` | Async REST client (requires `aiohttp`) |
| `stellarclassic_pulse.subscriptions.EventSubscription` | SSE event stream consumer |
| `stellarclassic_pulse.webhooks.verify_webhook_signature` | HMAC-SHA256 webhook verification |
| `stellarclassic_pulse.exceptions` | `StellarClassicPulseError`, `ApiError`, `AuthenticationError` |
