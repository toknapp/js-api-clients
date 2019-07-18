const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing users.create() with wallet creation', async function (t) {
  const clientIp = '127.0.0.1';
  const userAgent = 'Upvest JS API client test script';
  const assetIds = Object.values(testenv.config.assetIds);
  const { username, password, recoverykit, wallet_ids } = await partials.tCreateUser(t, testenv.tenancy, clientIp, userAgent, assetIds);
  if (! username) return;

  // TODO Make number of "merging" assets configurable.
  t.equal(wallet_ids.length, assetIds.length - 1, 'Number of wallets created is one less than number of requested assets because ETH and ERC20 get combined in 1 wallet.');

  partials.tIsRecoveryKitValid(t, recoverykit);

  t.end();
});
