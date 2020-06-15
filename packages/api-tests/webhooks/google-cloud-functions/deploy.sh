#!/bin/bash

SERVICE_ACCOUNT=${SERVICE_ACCOUNT-http-req-to-pubsub@upvest-development.iam.gserviceaccount.com}
TOPIC_ID=${TOPIC_ID-upvest-js-client-test-webhook}

gcloud functions deploy httpRequestToPubsubMessage --source=. --runtime python37 --trigger-http --service-account=$SERVICE_ACCOUNT --set-env-vars TOPIC_ID=$TOPIC_ID
