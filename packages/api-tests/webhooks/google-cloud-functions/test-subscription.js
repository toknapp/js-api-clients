
const inspect = (...things) => things.forEach(thing => console.dir(thing, {depth:null, colors:true}));



class TestSubscription {
  constructor(projectId, topicId) {
    this.projectId = projectId || process.env.GCP_PROJECT;
    this.topicId = topicId || process.env.TOPIC_ID;
  }

  async setup() {
    const { getGooglePubsubSubscription } = require('./subscription.js');
    this.googlePubsubSubscription = await getGooglePubsubSubscription(this.projectId, this.topicId);

    this.googlePubsubSubscription.on('message', message => {
      message.ack();
      const msgData = JSON.parse(message.data);

      const body = msgData.bodyIsHex ? Buffer.fromString(msgData.body, 'hex') : msgData.body;
      msgData.body = body;

      const metaData = {
        pubsubMessageId: message.id,
      };

      inspect(msgData, metaData);
    });

    return this.googlePubsubSubscription;
  }

  finalize() {
    this.googlePubsubSubscription.removeAllListeners();
    this.googlePubsubSubscription.close();
  }
}


const t = new TestSubscription();
t.setup();


process.on('exit', (code) => {
  t.finalize();
});
