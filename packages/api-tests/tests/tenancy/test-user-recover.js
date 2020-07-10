const crypto = require('crypto');

const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing users.recover()', async function (t) {
  let echoSuccess;
  const clientIp = '127.0.0.1';
  const userAgent = 'Upvest JS API client test script';
  // const assetIds = Object.values(testenv.config.assetIds);
  const assetIds = [testenv.config.assetIds.Ether];
  const { username, password, recoverykit, wallet_ids } = await partials.tCreateUser(t, testenv.tenancy, clientIp, userAgent, assetIds, true);
  if (! username) return;

  // Acquire and keep OAuth2 access token with original password, so that we can
  // use it to monitor wallet status *while* the password gets changed.
  const grandfatheredClientele = testenv.getClienteleAPI(username, password)

  t.comment('See if OAuth2 with original password works.');
  echoSuccess = await partials.tEcho(t, grandfatheredClientele);
  if (! echoSuccess) return;

  const webhookRecording = await testenv.getWebhookRecording();

  const rk = await testenv.unpackRecoveryKit(recoverykit, testenv.config.tenant.public_key_base64, testenv.config.tenant.private_key_base64_last_chance_to_see);

  t.equal(rk.userAgent, userAgent, '"userAgent" field in the Recovery Kit matches with given value');
  t.equal(rk.clientIp, clientIp, '"clientIp" field in the Recovery Kit matches with given value');
  t.equal(rk.username.substring(rk.username.indexOf('|') + 1), username, '"username" field in the Recovery Kit matches with given value');
  t.ok((Date.now() - (rk.datetime.low * 1000)) < 20 * 60 * 1000, '"datetime" field in the Recovery Kit contains a recent timestamp.');

  const newPassword = testenv.cryptoRandomString({length: 10, type: 'distinguishable'});

  t.comment('Recovering the user with a new password and a decrypted Recovery Kit.');
  let recoverResult;
  try {
    recoverResult = await testenv.tenancy.users.recover(rk.seed, rk.seedhash, rk.userId, newPassword);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Recovering the user with a new password and a decrypted Recovery Kit.');
  }
  t.ok(recoverResult, 'The recover call was sent.');

  for (const walletId of wallet_ids) {
    webhookRecording.addMatcher((body, simpleHeaders, rawHeaders, metaData) => {
      const webhookPayload = JSON.parse(body);
      if (webhookPayload.data.username != username) {
        // We do not match other test run's webhooks.
        return false;
      }

      if (webhookPayload.data.id != walletId) {
        // This is not the webhook this matcher is looking for.
        return false;
      }

      t.equal(webhookPayload.action, 'wallet.recovered', 'Webhook action is "wallet.recovered"');

      const signatureHeader = simpleHeaders['X-Up-Signature'];
      t.ok(signatureHeader, 'Found webhook HMAC signature header');
      const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
      t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

      t.notEqual(webhookPayload.data.address.length, 0, `Received webhook with wallet address for Wallet ID ${walletId}.`);

      return true;
    });
  }

  try {
    t.comment('Waiting for all expected webhooks to be called.')
    const areAllExpectedWebhooksCalled = await webhookRecording.areAllMatched(3 * 60 * 1000);
    t.ok(areAllExpectedWebhooksCalled, 'All expected webhooks were called');
  }
  catch (err) {
    inspect(err);
    t.fail('Timed out while waiting for all expected webhooks to be called');
  }

  webhookRecording.stop();

  // In case no webhook setup is configured.
  await partials.tWaitForWalletActivation(t, grandfatheredClientele);

  try {
    echo = await testenv.getClienteleAPI(username, password).echo('all good');
    t.fail('OAuth2 with original password should have failed, but did not.');
  }
  catch (error) {
    t.equal(error.response.status, 401, 'OAuth2 with original password fails with status 401.');
    t.equal(error.response.data.error, 'invalid_grant', 'OAuth2 with original password fails with error code "invalid_grant".');
  }

  const newClientele = testenv.getClienteleAPI(username, newPassword);

  t.comment('See if OAuth2 with new password works.');
  echoSuccess = await partials.tEcho(t, newClientele);
  if (! echoSuccess) return;

  t.comment('Test signing with new password.');
  let signCount = 0;
  for (const walletId of wallet_ids) {
    const wallet = await newClientele.wallets.retrieve(walletId);

    inspect(wallet);

    // Only test Tx creation for ETH and ERC20.
    const protocolNamesToTestWith = [
      'ethereum', 'erc20',
      'ethereum_ropsten', 'erc20_ropsten',
      'ethereum_kovan', 'erc20_kovan',
    ];
    if (!protocolNamesToTestWith.includes(wallet.protocol)) {
      continue;
    }

    await partials.tEthereumSigning(t, newClientele, wallet, newPassword);
    signCount++;
  }
  t.ok(signCount > 0, 'At least one signature was tested.');

  t.end();
});
