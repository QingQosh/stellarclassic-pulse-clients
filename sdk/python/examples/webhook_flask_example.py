"""Example: verifying StellarClassicPulse webhooks in a Flask endpoint."""

import os

from flask import Flask, request, abort

from stellarclassic_pulse import verify_webhook_signature, WebhookVerificationError

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["SOROBAN_PULSE_WEBHOOK_SECRET"]


@app.route("/webhooks/stellarclassic-pulse", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("X-StellarClassicPulse-Signature", "")
    try:
        verify_webhook_signature(request.data, signature, WEBHOOK_SECRET)
    except WebhookVerificationError:
        abort(400, "invalid signature")

    event = request.get_json()
    print("received verified event:", event["event_type"])
    return "", 204
