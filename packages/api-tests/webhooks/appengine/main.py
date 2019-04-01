import collections
import json
import time

from geventwebsocket.exceptions import WebSocketError

from flask import Flask, request, render_template
from flask_sockets import Sockets


WEBHOOK_METHODS = [
    "GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH",
]


app = Flask(__name__)
sockets = Sockets(app)

# TODO Use weak references to facilitate GC
subscriptions = collections.defaultdict(list)


@sockets.route("/websocket/<string:webhook_id>")
def subscription_socket(ws, webhook_id):
    subscriptions[webhook_id].append(ws)
    while not ws.closed:
        time.sleep(1)
    subscriptions[webhook_id].remove(ws)


@app.route("/")
def index():
    payload = {
        "status": "ok",
        "description": "webhook-to-websocket forwarder. try /webhook/<webhook_id> and /websocket/<webhook_id>"
    }
    return (json.dumps(payload), 200, {"Content-Type": "application/json"})

@app.route("/webhook/<string:webhook_id>", methods=WEBHOOK_METHODS)
def webhook(webhook_id):
    try:
        body = request.data.decode(encoding="utf-8")
        body_is_hex = False
    except Exception:
        body = binascii.b2a_hex(getattr(request, "data", "")).decode(encoding="utf-8")
        body_is_hex = True

    headers = {}
    lowercase_headers = {}
    raw_headers = []
    for name, value in request.headers.items():
        headers[name] = value
        lowercase_headers[name.lower()] = value
        raw_headers.append((name, value))

    payload = {
        "webhookId": webhook_id,
        "method": request.method,
        "path": request.full_path,
        "headers": headers,
        "lowercaseHeaders": lowercase_headers,
        "rawHeaders": raw_headers,
        "body": body,
        "bodyIsHex": body_is_hex,
    }

    ws_payload = json.dumps(payload)
    pruned_subscriptions = []
    for subscription_ws in subscriptions[webhook_id]:
        if not subscription_ws.closed:
            try:
                subscription_ws.send(ws_payload)
                pruned_subscriptions.append(subscription_ws)
            except WebSocketError:
                pass

    if len(pruned_subscriptions) == 0:
        del subscriptions[webhook_id]
    else:
        subscriptions[webhook_id] = pruned_subscriptions

    subscription_count = len(pruned_subscriptions)

    response_payload = {"status":"ok", "wsPayload":payload, "wsCount":subscription_count}
    return (json.dumps(response_payload), 200, {"Content-Type": "application/json"})


if __name__ == "__main__":
    print("""
This can not be run directly because the Flask development server does not
support web sockets. Instead, use gunicorn:

gunicorn -b 127.0.0.1:8080 -k flask_sockets.worker main:app

""")
