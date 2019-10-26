import binascii
import json
import os
import time
from typing import Union, Sequence, Tuple, Callable
from urllib.parse import urlsplit

from google.cloud import pubsub


GCP_PROJECT = os.environ["GCP_PROJECT"]
TOPIC_ID = os.environ["TOPIC_ID"]

publisher = pubsub.PublisherClient()
topic_path = publisher.topic_path(GCP_PROJECT, TOPIC_ID)


def publish(payload: Union[dict, list], **msg_attrs: str):
    bytedata = json.dumps(payload).encode(encoding="utf-8")
    future = publisher.publish(topic_path, bytedata, **msg_attrs)
    return future


def get_path_params(path: str) -> tuple:
    path_parts = urlsplit(path).path.strip("/").split("/")
    webhook_id = path_parts[0] if len(path_parts) else "undefined"
    sleep_duration = path_parts[1] if len(path_parts) > 1 else 0

    try:
        sleep_duration = float(sleep_duration)
    except Exception:
        sleep_duration = 0

    return webhook_id, sleep_duration


def answer_if_verify_challenge(body: str) -> dict:
    try:
        payload = json.loads(body)
    except Exception:
        return {}
    else:
        if (
            type(payload) is dict
            and
            "action" in payload
            and
            payload["action"] == "url.verify"
            and
            "challenge" in payload
        ):
            return {"challenge": payload["challenge"]}

    return {}


def httpRequestToPubsubMessage(request):
    received_time = time.time()
    try:
        body = request.data.decode(encoding="utf-8")
        body_is_hex = False
    except Exception:
        body = binascii.b2a_hex(request.data).decode(encoding="utf-8")
        body_is_hex = True

    headers = {}
    lowercase_headers = {}
    raw_headers = []
    for name, value in request.headers.items():
        headers[name] = value
        lowercase_headers[name.lower()] = value
        raw_headers.append((name, value))

    webhook_id, sleep_duration = get_path_params(request.full_path)

    if sleep_duration:
        time.sleep(sleep_duration)

    payload = {
        "receivedTime": received_time,
        "sleepDuration": sleep_duration,
        "pubsubTopicPath": topic_path,
        "webhookId": webhook_id,
        "method": request.method,
        "path": request.full_path,
        "headers": headers,
        "lowercaseHeaders": lowercase_headers,
        "rawHeaders": raw_headers,
        "body": body,
        "bodyIsHex": body_is_hex,
    }

    response_payload = {
        "status": "ok",
        "pubsubPayload": payload,
    }

    response_payload.update(answer_if_verify_challenge(body))

    pubsub_response = publish(payload)
    try:
        pubsub_result = pubsub_response.result(10)
    except Exception:
        pass
    else:
        response_payload["pubsubMsgId"] = pubsub_result

    return (json.dumps(response_payload), 200, {"Content-Type": "application/json"})
