#!/bin/bash

gcloud functions deploy httpRequestToPubsubMessage --source=. --runtime python37 --trigger-http --set-env-vars TOPIC_ID=${TOPIC_ID-upvest-js-client-test-webhook}
