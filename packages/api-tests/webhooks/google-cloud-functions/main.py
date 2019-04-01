import binascii
import json
import os
from typing import Union, Sequence, Tuple, Callable

from google.cloud import pubsub


GCP_PROJECT = os.environ['GCP_PROJECT']
TOPIC_ID = os.environ['TOPIC_ID']


def publish(payload: Union[dict, list], **msg_attrs: str):
    bytedata = json.dumps(payload).encode(encoding="utf-8")

    publisher = pubsub.PublisherClient()

    topic_path = publisher.topic_path(GCP_PROJECT, TOPIC_ID)

    future = publisher.publish(topic_path, bytedata, **msg_attrs)

    return future


def httpRequestToPubsubMessage(request):
    try:
        body = request.data.decode(encoding="utf-8")
        body_is_hex = False
    except Exception:
        body = binascii.b2a_hex(request.data).decode(encoding="utf-8")
        body_is_hex = True

    publish({
        'method': request.method,
        'path': request.full_path,
        'headers': [(name, value) for name, value in request.headers.items()],
        'body': body,
        'bodyIsHex': body_is_hex,
    })

    return ('{"status":"ok"}', 200, {'Content-Type': 'application/json'})
