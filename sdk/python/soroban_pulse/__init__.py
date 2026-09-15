"""Official Python SDK for StellarClassicPulse."""

from .client import StellarClassicPulseClient
from .async_client import AsyncStellarClassicPulseClient
from .subscriptions import EventSubscription
from .webhooks import verify_webhook_signature, WebhookVerificationError
from .exceptions import StellarClassicPulseError, ApiError, AuthenticationError

__version__ = "0.1.0"

__all__ = [
    "StellarClassicPulseClient",
    "AsyncStellarClassicPulseClient",
    "EventSubscription",
    "verify_webhook_signature",
    "WebhookVerificationError",
    "StellarClassicPulseError",
    "ApiError",
    "AuthenticationError",
]
