const cryptoRandomString = require('crypto-random-string');

const { PubSub } = require('@google-cloud/pubsub');


async function getGooglePubsubSubscription(projectId, topicId, credentials) {
  const subscriptionId = topicId + '-' + cryptoRandomString(16);

  const pubsub = new PubSub({ projectId, credentials });
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
