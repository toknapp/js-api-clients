const cryptoRandomString = require('crypto-random-string');

const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();

async function getGooglePubsubSubscription(projectId, topicId) {
  projectId = projectId || process.env.GCP_PROJECT;
  topicId = topicId || process.env.TOPIC_ID || 'upvest-js-client-test-webhook';
  const subscriptionId = topicId + '-' + cryptoRandomString(16);

  const [ topic ] = await pubsub.topic(topicId).get({ autoCreate: true });
  const [ subscription ] = await topic.createSubscription(
    subscriptionId,
    {
      ackDeadlineSeconds: 60, // allowed minimum 10 seconds
      messageRetentionDuration: 10 * 60, // allowed minimum 10 minutes
      expirationPolicy: {ttl: {seconds: 24 * 60 * 60}}, // allowed minimum 1 day
    }
  );

  return subscription;
}

module.exports = {
  getGooglePubsubSubscription,
};
