// Set up all utilities for testing, the same way.

const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const test = require('tape');

const BN = require('bn.js');
const int2BN = num => new BN(num);
const hex2BN = num => new BN(num, 16);

const cryptoRandomString = require('crypto-random-string');

const { EthereumAndErc20Faucet } = require('./faucet.js');

const { WebhookListener } = require('./webhook.js');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI, UpvestClienteleAPIFromOAuth2Token } = require('@upvest/clientele-api');

const {
  inspect, inspectResponse, inspectError, readlineQuestionPromise,
  getBalanceForAssetId,
} = require('./util.js');

const { test_config: config } = require('./cli-options.js');

const tenancy = new UpvestTenancyAPI(
  config.baseURL,
  config.first_apikey.key,
  config.first_apikey.secret,
  config.first_apikey.passphrase_last_chance_to_see,
);

const getClienteleAPI = (username, password) => new UpvestClienteleAPI(
  config.baseURL,
  config.first_oauth2_client.client_id,
  config.first_oauth2_client.client_secret,
  username,
  password
);

const partials = require('./partials.js');

module.exports = {
  test,
  BN, int2BN, hex2BN,
  partials,
  setTimeoutPromise, cryptoRandomString, EthereumAndErc20Faucet, WebhookListener,
  UpvestTenancyAPI, UpvestClienteleAPI, UpvestClienteleAPIFromOAuth2Token,
  inspect, inspectResponse, inspectError, readlineQuestionPromise,
  getBalanceForAssetId,
  config,
  tenancy,
  getClienteleAPI,
}
