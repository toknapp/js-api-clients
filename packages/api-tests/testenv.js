// Set up all utilities for testing, the same way.

const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const test = require('tape');

const BN = require('bn.js');
const int2BN = num => new BN(num);
const hex2BN = num => new BN(num, 16);

const cryptoRandomString = require('crypto-random-string');

const { EthereumAndErc20Faucet } = require('./faucet.js');

const { WebhookListener, DummyWebhookRecording } = require('./webhook.js');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI, UpvestClienteleAPIFromOAuth2Token } = require('@upvest/clientele-api');

const {
  getBalanceForAssetId, hexdump, removeHexPrefix
} = require('./util.js');

function getTestenv(config) {
  const tenancy = new UpvestTenancyAPI(
    config.baseURL,
    config.first_apikey.key,
    config.first_apikey.secret,
    config.first_apikey.passphrase_last_chance_to_see,
    config.timeOut,
  );

  const getClienteleAPI = (username, password) => new UpvestClienteleAPI(
    config.baseURL,
    config.first_oauth2_client.client_id,
    config.first_oauth2_client.client_secret,
    username,
    password,
    ['read', 'write', 'echo', 'wallet', 'transaction'],
    config.timeOut,
  );

  let webhooks;

  const getWebhooks = async () => {
    if ('undefined' === typeof webhooks) {
      if (config.webhook) {
        webhooks = new WebhookListener(config.webhook);
        await webhooks.ready;
        test.onFinish(() => webhooks.finalize());
      }
      else {
        webhooks = null;
      }
    }
    return webhooks;
  }

  const getWebhookRecording = async () => {
    const webhooks = await getWebhooks();
    return webhooks ? webhooks.startRecording() : new DummyWebhookRecording();
  }

  return {
    BN, int2BN, hex2BN,
    setTimeoutPromise, cryptoRandomString, EthereumAndErc20Faucet, WebhookListener,
    UpvestTenancyAPI, UpvestClienteleAPI, UpvestClienteleAPIFromOAuth2Token,
    getBalanceForAssetId, hexdump, removeHexPrefix,
    config,
    getWebhooks, getWebhookRecording,
    tenancy,
    getClienteleAPI,
  }
}

module.exports = { getTestenv };
