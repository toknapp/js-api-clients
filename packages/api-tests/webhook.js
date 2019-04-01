
class WebhookListener {
  constructor(webhookConfig) {
    this.webhookConfig = webhookConfig;
    this.expectors = new Set();
    this.allExpectationsAreMet = false;
    this.allExpectationsMetCallbacks = new Set();
    this.finalizeCallbacks = new Set();

    this.readyPromise = new Promise((resolveReadyPromise, rejectReadyPromise) => {
      if (this.webhookConfig.type == 'google-pubsub') {
        this._setupGooglePubsubSubscription().then(subscription => resolveReadyPromise(subscription)).catch(err => rejectReadyPromise(err));
      }
      else if (this.webhookConfig.type == 'appengine') {
        this._setupAppengineSubscription().then(subscription => resolveReadyPromise(subscription)).catch(err => rejectReadyPromise(err));
      }
      else {
        rejectReadyPromise(new Error(`Unable to initialize webhook of type "${this.webhookConfig.type}".`));
      }
    });
  }

  get ready() {
    return this.readyPromise;
  }

  addExpector(expector) {
    this.expectors.add(expector);
  }

  areAllExpectationsMet(timeOut) {
    return new Promise((resolveAllExpectationsMetPromise, rejectAllExpectationsMetPromise) => {
      if (this.allExpectationsAreMet) {
        resolveAllExpectationsMetPromise(true);
      }
      else {
        const timeoutID = setTimeout(() => rejectAllExpectationsMetPromise(false), timeOut);
        this.allExpectationsMetCallbacks.add(() => {clearTimeout(timeoutID); resolveAllExpectationsMetPromise(true);});
      }
    });
  }

  finalize() {
    for (const finalizeCallback of this.finalizeCallbacks) {
      finalizeCallback();
    }
  }

  _processExpectors(body, simpleHeaders, rawHeaders, metaData) {
    for (const expector of this.expectors) {
      const expectationIsMet = expector(body, simpleHeaders, rawHeaders, metaData);
      if (expectationIsMet) {
        this.expectors.delete(expector);
        break;
      }
    }

    if (this.expectors.size == 0) {
      this.finalize();
      this.allExpectationsAreMet = true;
      for (const allExpectationsMetCallback of this.allExpectationsMetCallbacks) {
        allExpectationsMetCallback();
      }
    }
  }

  async _setupGooglePubsubSubscription() {
    const { getGooglePubsubSubscription } = require('./webhooks/google-cloud-functions/subscription.js');
    this.googlePubsubSubscription = await getGooglePubsubSubscription(this.webhookConfig.projectId, this.webhookConfig.topicId);

    this.googlePubsubSubscription.on('message', message => {
      message.ack();
      const msgData = JSON.parse(message.data);

      const body = msgData.bodyIsHex ? Buffer.fromString(msgData.body, 'hex') : msgData.body;
      const rawHeaders = msgData.headers;
      const simpleHeaders = {};
      for (const [headerName, headerValue] of rawHeaders) {
        simpleHeaders[headerName] = headerValue;
      }

      const metaData = {
        pubsubMessageId: message.id,
      };

      this._processExpectors(body, simpleHeaders, rawHeaders, metaData);
    });

    this.finalizeCallbacks.add(() => {
      this.googlePubsubSubscription.removeAllListeners();
      this.googlePubsubSubscription.close();
    });

    return this.googlePubsubSubscription;
  }

  async _setupAppengineSubscription() {
    const { getAppengineSubscription } = require('./webhooks/appengine/subscription.js');
    this.appengineSubscription = await getAppengineSubscription(this.webhookConfig.wsUrl);

    this.appengineSubscription.on('message', message => {
      const msgData = JSON.parse(message);

      const body = msgData.bodyIsHex ? Buffer.fromString(msgData.body, 'hex') : msgData.body;
      const simpleHeaders = msgData.headers;
      const rawHeaders = msgData.rawHeaders;
      const metaData = {};

      this._processExpectors(body, simpleHeaders, rawHeaders, metaData);
    });

    this.finalizeCallbacks.add(() => {
      this.appengineSubscription.removeAllListeners();
      this.appengineSubscription.terminate();
    });

    return this.appengineSubscription;
  }
}

module.exports = {
  WebhookListener,
};
