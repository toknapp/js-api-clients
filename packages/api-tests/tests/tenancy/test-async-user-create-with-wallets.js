const crypto = require('crypto');

const testenv = require('../../testenv.js');
const partials = require('../../partials.js');
const uuidv4 = require('uuid').v4;

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

  const humanDate = () => (new Date()).toISOString();

  t.comment(`Hooking up the webhook listener, might take a bit.`);
  const webhookRecording = await testenv.getWebhookRecording();
  t.comment(`Webhook listener hooked up.`);

  const miniCreate = async () => {
    const requestId = uuidv4();
    const username = testenv.cryptoRandomString(10);
    const password = testenv.cryptoRandomString(10);
    const before = Date.now();
    let user;
    try {
      t.comment(`Time of async create user "${username}" reqId( ${requestId} ): ${humanDate()}, ${before/1000}`);
      user = await testenv.tenancy.users.create(username, password, clientIp, userAgent, assetIds, true, false, requestId);
    }
    catch (err) {
      partials.tErrorFail(t, err, 'Creating the user failed.');
    }
    const clientLatency = (Date.now() - before) / 1000;
    t.comment(`Duration of async create user "${username}" reqId( ${requestId} ): client ${clientLatency} seconds`);

    webhookRecording.addMatcher(async (body, simpleHeaders, rawHeaders, metaData) => {
      const webhookPayload = JSON.parse(body);
      if (webhookPayload.action != 'user.created') {
        // This is not the webhook this matcher is looking for.
        return false;
      }

      if (webhookPayload.data.username != username) {
        // We do not match other test run's webhooks.
        return false;
      }

      t.comment(`Received "user.created" webhook for user ${user.username}.`);

      const signatureHeader = simpleHeaders['X-Up-Signature'];
      t.ok(signatureHeader, 'Found webhook HMAC signature header');
      const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
      t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

      partials.tIsRecoveryKitValid(t, webhookPayload.data.recoverykit);

      const webHookWalletIds = [];
      for (const wallet of webhookPayload.data.wallets) {
        webHookWalletIds.push(wallet.id);
        t.notEqual(wallet.address.length, 0, `"user.created" webhook has an address for Wallet ID ${wallet.id}.`);
      }
      t.ok(testenv.setEqual(user.wallet_ids, webHookWalletIds), 'All expected wallets are in the "user.created" webhook.');

      return true;
    });

    return user;
  }

  const promises = [];
  for (let i = 0; i < PARALLEL; i++) {
    promises.push(miniCreate());
  }

  inspect(promises);

  const results = await Promise.all(promises);

  inspect(...results);

  for (const user of results) {
    if (! 'wallet_ids' in user) {
      continue;
    }
    for (const walletId of user.wallet_ids) {
      webhookRecording.addMatcher((body, simpleHeaders, rawHeaders, metaData) => {
        const webhookPayload = JSON.parse(body);
        if (webhookPayload.action != 'wallet.created') {
          // This is not the webhook this matcher is looking for.
          return false;
        }

        if (webhookPayload.data.username != user.username) {
          // We do not match other test run's webhooks.
          return false;
        }

        if (webhookPayload.data.id != walletId) {
          // This is not the webhook this matcher is looking for.
          return false;
        }

        t.comment(`Received "wallet.created" webhook for user ${user.username}: id = ${webhookPayload.data.id}, address = ${webhookPayload.data.address}`);
        const signatureHeader = simpleHeaders['X-Up-Signature'];
        t.ok(signatureHeader, 'Found webhook HMAC signature header');
        const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
        t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

        t.notEqual(webhookPayload.data.address.length, 0, `Wallet address is not an empty string.`);

        return true;
      });
    }
  }

  try {
    t.comment(`Number of webhook matchers: ${webhookRecording.matchers.size}`);
    const waitMinutes = PARALLEL * 4;
    t.comment(`Waiting for ${waitMinutes} minutes for all expected webhooks to be called.`);
    const areAllExpectedWebhooksCalled = await webhookRecording.areAllMatched(waitMinutes * 60 * 1000);
    t.ok(areAllExpectedWebhooksCalled, 'All expected webhooks were called');
  }
  catch (err) {
    inspect(err);
    t.fail('Timed out while waiting for all expected webhooks to be called');
  }

  t.end();
});
