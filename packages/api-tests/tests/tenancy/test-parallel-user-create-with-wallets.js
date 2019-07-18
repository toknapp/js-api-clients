const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;

test('Testing parallel users.create() with wallet creation', async function (t) {
  const PARALLEL = testenv.parallel;

  t.comment(`Creating ${PARALLEL} users in parallel.`);
  t.comment((new Date()).toISOString());
  const clientIp = '127.0.0.1';
  const userAgent = 'Upvest JS API client test script';
  const assetIds = [
    // testenv.config.assetIds.Arweave,
    // testenv.config.assetIds.Bitcoin,
    // testenv.config.assetIds.Ether,
    testenv.config.assetIds.ExampleERC20,
  ];

  const miniCreate = async () => {
    const username = testenv.cryptoRandomString(10);
    const password = testenv.cryptoRandomString(10);
    const before = Date.now();
    let user;
    try {
      user = await testenv.tenancy.users.create(username, password, clientIp, userAgent, assetIds);
    }
    catch (err) {
      partials.tErrorFail(t, err, 'Creating the user failed.');
    }
    const duration = (Date.now() - before) / 1000;
    t.comment(`Duration of create user: ${duration} seconds`);
    return user;
  }

  const promises = [];

  for (let i = 0; i < PARALLEL; i++) {
    promises.push(
      miniCreate()
      // testenv.tenancy.users.create(username, password, clientIp, userAgent, assetIds)
      // partials.tCreateUser(t, testenv.tenancy, clientIp, userAgent, assetIds)
    );
  }
  
  inspect(promises);
  
  const results = await Promise.all(promises);
  
  for (const result of results) {
    const { username, password, recoverykit, wallet_ids } = result;
    t.ok(username, 'Has username');
    // t.equal(wallet_ids.length, assetIds.length - 1, 'Number of wallets created is one less than number of requested assets because ETH and ERC20 get combined in 1 wallet.');
    t.equal(wallet_ids.length, assetIds.length, 'Number of wallets as expected.');
    partials.tIsRecoveryKitValid(t, recoverykit);
  }
  
  t.end();
});
