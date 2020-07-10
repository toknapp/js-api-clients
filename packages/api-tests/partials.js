const crypto = require('crypto');

const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const uuidv4 = require('uuid').v4;

const cryptoRandomString = require('crypto-random-string');

const xmlParser = require('fast-xml-parser');

const testenv = require('./testenv.js');

const {
  inspect, inspectResponse, inspectError, readlineQuestionPromise, getBalanceForAssetId, removeHexPrefix
} = require('./util.js');

// For Ethereum signature
const { keccak256 } = require('web3-utils');
const EC = require('elliptic').ec;

const CURVE = 'secp256k1';

// Create and initialize EC context (better do it once and reuse it)
const ec = new EC(CURVE);


const tErrorFail = (t, error, message) => {
  inspectError(error);
  t.fail(message);
  t.end();
  return false;
};

const tGetCachedOrCreateUser = async (t, tenancy) => {
  if (! tenancy._cachedUser) {
    tenancy._cachedUser = tCreateUser(t, tenancy);
  }
  else {
    t.comment('Re-use cached user.')
  }
  return tenancy._cachedUser;
};

const tCreateUser = async (t, tenancy, clientIp, userAgent, assetIds, rawRecoverykit) => {
  t.comment('Create user.');
  const withAssets = Array.isArray(assetIds) && assetIds.length > 0;
  const username = cryptoRandomString({length: 10, type: 'distinguishable'});
  const password = cryptoRandomString({length: 10, type: 'distinguishable'});

  let webhookRecording;
  if (withAssets) {
    webhookRecording = await testenv.getWebhookRecording();
  }

  let user;
  try {
    const before = Date.now();
    user = await tenancy.users.create(username, password, clientIp, userAgent, assetIds, false, rawRecoverykit);
    const duration = (Date.now() - before) / 1000;
    t.comment(`Duration of create user: ${duration} seconds`);
  }
  catch (error) {
    tErrorFail(t, error, 'Creating the user failed.');
    return { username:null, password:null, recoverykit:null, wallet_ids:null };
  }

  t.equal(user.username, username, 'Actual and expected username are equal');

  if (withAssets) {
    for (const walletId of user.wallet_ids) {
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

        t.equal(webhookPayload.action, 'wallet.created', 'Webhook action is "wallet.created"');

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

    const clientele = testenv.getClienteleAPI(username, password);
    // In case no webhook setup is configured.
    await tWaitForWalletActivation(t, clientele);
  }

  user.password = password;
  return user;
};

const tEcho = async (t, api) => {
  const shouts = [
    'Hello',
    'Hello, world!',
    'Hello, world & peace = mindfulness!',
    'Ωμέγα',
    'ǈiljana',
    '陳大文',
  ];
  for (const shout of shouts) {
    let echoPost;
    try {
      echoPost = await api.echo(shout);
    }
    catch (error) {
      return tErrorFail(t, error, 'Failed to call echo endpoint. (Or, if this was run via OAuth2, it might also mean that obtaining the OAuth2 token failed.)');
    }
    t.equal(echoPost, shout, `Actual and expected echo are equal (POST "${shout}")`);

    let echoGet;
    try {
      echoGet = await api.echoGet(shout);
    }
    catch (error) {
      return tErrorFail(t, error, 'Failed to call echo endpoint. (Or, if this was run via OAuth2, it might also mean that obtaining the OAuth2 token failed.)');
    }
    t.equal(echoGet, shout, `Actual and expected echo are equal (GET "${shout}")`);
  }
  return true;
};

const tCreateWallets = async (t, api, assetIdsAndIndexes, username, password) => {
  t.comment(`Create wallets for ${assetIdsAndIndexes.length} assets.`)

  const webhookRecording = await testenv.getWebhookRecording();

  let createdWallets = [];
  for (const assetIdAndMaybeIndex of assetIdsAndIndexes) {
    let assetId;
    let index;
    if (typeof assetIdAndMaybeIndex == 'string') {
      assetId = assetIdAndMaybeIndex;
      index = null;
    }
    else if (Array.isArray(assetIdAndMaybeIndex)) {
      assetId = assetIdAndMaybeIndex[0];
      index = assetIdAndMaybeIndex[1];
    }
    else if ('assetId' in assetIdAndMaybeIndex && 'index' in assetIdAndMaybeIndex) {
      assetId = assetIdAndMaybeIndex['assetId'];
      index = assetIdAndMaybeIndex['index'];
    }
    else {
      throw Error(`Can not understand assetId and/or index in ${assetIdAndMaybeIndex}.`);
    }

    const requestId = uuidv4();

    t.comment(`About to create wallet for assetId ${assetId}, index ${index}. reqId( ${requestId} )`)
    let wallet;
    try {
      wallet = await api.wallets.create(assetId, password, index, requestId);
    }
    catch (error) {
      return tErrorFail(t, error, `Creating the wallet for assetId ${assetId} and index ${index} failed. reqId( ${requestId} )`);
    }
    // t.comment(`Inspecting created wallet: reqId( ${requestId} )`);
    // inspect(wallet);

    webhookRecording.addMatcher((body, simpleHeaders, rawHeaders, metaData) => {
      const webhookPayload = JSON.parse(body);
      if (webhookPayload.data.username != username) {
        // We do not match other test run's webhooks.
        return false;
      }

      if (webhookPayload.data.id != wallet.id) {
        // This is not the webhook this matcher is looking for.
        return false;
      }

      t.equal(webhookPayload.action, 'wallet.created', 'Webhook action is "wallet.created"');

      const signatureHeader = simpleHeaders['X-Up-Signature'];
      t.ok(signatureHeader, 'Found webhook HMAC signature header');
      const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
      t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

      t.notEqual(webhookPayload.data.address.length, 0, `Received webhook with wallet address for Wallet ID ${wallet.id}. addr( ${webhookPayload.data.address} )`);

      // t.comment('Inspect incoming webhook:');
      // inspect(simpleHeaders, body);

      return true;
    });

    let createdAssetIds = [];
    for (const balance of wallet.balances) {
      createdAssetIds.push(balance.asset_id);
    }
    t.ok(-1 !== createdAssetIds.indexOf(assetId), 'Created wallet contains balance for requested asset.');
    createdWallets.push(wallet);
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
  await tWaitForWalletActivation(t, api);

  return createdWallets;
};

const tWaitForWalletActivation = async (t, api, minutes) => {
  t.comment('Wait for wallet activation.')
  // Poll user's wallets to see when seed generation has finished. Prefer
  // polling over the API Key callback, because this test script might run in
  // places which are not able to receive callbacks.
  const MAX_RETRIES = (minutes || 3) * 60;
  let isGenSeedFinished;
  let retries = 0;
  do {
    isGenSeedFinished = true;
    for await (const wallet of api.wallets.list()) {
      t.comment(`Waited ${retries} seconds.`);
      // inspect(wallet);
      if (wallet.status != 'ACTIVE' || wallet.address === null) {
        isGenSeedFinished = false;
        break;
      }
    }
    if (! isGenSeedFinished) {
      // Sleep for a second, then try again.
      await setTimeoutPromise(1000);
    }
    retries++;
  }
  while (! isGenSeedFinished && retries < MAX_RETRIES);
  t.ok(retries < MAX_RETRIES, `Waited less than ${MAX_RETRIES} seconds for seed generation.`);

  const GRACE_PERIOD = Math.min(10, (retries - 1));
  t.comment(`Waiting for an additional grace period of ${GRACE_PERIOD} seconds.`)
  await setTimeoutPromise(GRACE_PERIOD * 1000);
};

const tWaitForBalanceUpdate = async (t, api, walletId, assetId, previousBalanceAmount, minutes) => {
  t.comment('Wait for balance update.')
  // Poll user's wallets to see when a specified balance changes. Prefer
  // polling over the API Key callback, because this test script might run in
  // places which are not able to receive callbacks.
  const MAX_RETRIES = (minutes || 10) * 60;
  let isBalanceUpdated;
  let retries = 0;
  do {
    let balance = null;
    isBalanceUpdated = true;
    const wallet = await api.wallets.retrieve(walletId);
    // inspect(wallet);
    balance = getBalanceForAssetId(wallet, assetId);
    // inspect(balance);

    if (balance) {
      if (balance.amount == previousBalanceAmount) {
        isBalanceUpdated = false;
      }
      else {
        return balance.amount;
      }
    }
    else {
      t.fail(`No balance found for asset ID ${assetId}.`);
    }
  
    t.comment(`Waited ${retries} seconds.`);

    if (! isBalanceUpdated) {
      // Sleep for a second, then try again.
      await setTimeoutPromise(1000);
    }
    retries++;
  }
  while (! isBalanceUpdated && retries < MAX_RETRIES);
  t.ok(retries < MAX_RETRIES, `Waited less than ${MAX_RETRIES} seconds for balance update.`);
  return previousBalanceAmount;
};

const tIsRecoveryKitValid = (t, recoverykit) => {
  const isRecoveryKitValidXml = (xmlParser.validate(recoverykit) === true);
  t.ok(isRecoveryKitValidXml, 'Recovery Kit is valid XML');
  if (isRecoveryKitValidXml) {
    let jsonObj;
    try {
      jsonObj = xmlParser.parse(recoverykit, { ignoreAttributes: false });
      t.ok('svg' in jsonObj, 'Recovery Kit SVG has <svg> root element.');
      t.ok('path' in jsonObj['svg'], 'SVG has <path> element.');
      t.ok('@_d' in jsonObj['svg']['path'], 'SVG <path> element has "d" attribute.');
      t.ok('@_id' in jsonObj['svg']['path'], 'SVG <path> element has "id" attribute.');
      t.equal(jsonObj['svg']['path']['@_id'], 'qr-path', '"id" attribute is "qr-path"');
    }
    catch (parseError) {
      return tErrorFail(t, parseError, 'Parsing the SVG as XML failed.');
    }
    // console.dir(jsonObj, {depth:null, colors:true});
  }
};


async function tEthereumSigning(t, api, wallet, password) {
  t.comment('Generate signature for Ethereum (or Erc20) wallet.')

  // Only test Tx creation for ETH and ERC20.
  const protocolNamesToTestWith = [
    'ethereum', 'erc20',
    'ethereum_ropsten', 'erc20_ropsten',
    'ethereum_kovan', 'erc20_kovan',
  ];
  if (-1 === protocolNamesToTestWith.indexOf(wallet.protocol)) {
    t.fail('Can not do Ethereum signature test with non-Ethereum wallet.');
  }

  const toSign = crypto.randomBytes(32).toString('hex');
  t.comment('Inspecting the payload/hash to be signed:');
  inspect(toSign);

  t.comment('Create signature.');
  let sig;
  try {
    sig = await api.signatures.sign(
      wallet.id,
      password,
      toSign,
      'hex',
      'hex'
    );
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the signature failed.');
  }
  t.comment('Inspecting signature:');
  inspect(sig);

  t.equal(sig['big_number_format'], 'hex', 'Signature output format is hexadecimal.');
  t.equal(sig['algorithm'], 'ECDSA', 'Signature algorithm is ECDSA');
  t.equal(sig['curve'], CURVE, `Signature uses the "${CURVE}" curve.`);

  // Pseudocode for checking an Ethereum wallet address against public key:
  // `lowercase(address) == lowercase(hex(takeLastTwentyBytes(keccak256(concat(pad32(pubkey.x), pad32(pubkey.y))))))`

  const pubKeyXPadded = removeHexPrefix(sig['public_key']['x']).padStart(64, '0');
  const pubKeyYPadded = removeHexPrefix(sig['public_key']['y']).padStart(64, '0');
  const pubKeyHex = '0x' + pubKeyXPadded + pubKeyYPadded;
  // t.comment('Inspecting pubKeyHex:');
  // inspect(pubKeyHex);

  const addressHash = keccak256(pubKeyHex);
  // t.comment('Inspecting addressHash:');
  // inspect(addressHash, addressHash.slice(-40));

  t.equal('0x' + addressHash.slice(-40).toLowerCase(), wallet.address.toLowerCase(), 'Last 20 bytes of keccak256 hash of the public key are the Ethereum address.')

  // Import public key
  const publicKey = ec.keyFromPublic(
    {
      x: removeHexPrefix(sig['public_key']['x']),
      y: removeHexPrefix(sig['public_key']['y']),
    },
    'hex'
  );

  // Verify signature
  t.ok(publicKey.verify(toSign, {
    r: removeHexPrefix(sig['r']),
    s: removeHexPrefix(sig['s']),
  }), 'Signature can be verified');
}


const tVerifyDynamicWebhookBaseUrl = async (t, api, baseUrl) => {
  t.comment(`Verify dynamic webhook base URL: ${baseUrl}`);
  let verifyResponse;
  try {
    verifyResponse = await api.webhooks.verifyBaseUrl(baseUrl);
  }
  catch (error) {
    return tErrorFail(t, error, 'Verifying the webhook base URL failed.');
  }
  t.comment('Inspecting verify response.');
  inspect(verifyResponse);
}


const tCreateDynamicWebhookWithMatcher = async (t, api, eventFilters, specificWebhookMatcher) => {
  t.comment('Create dynamic webhook.');

  const dynamicBaseUrl = testenv.config.webhook.dynamicBaseUrl.replace(/\/+$/, '');
  const webhookReceiverId = `${testenv.config.webhook.webhookId}-${cryptoRandomString({length: 32, type: 'distinguishable'})}`;
  const url = `${dynamicBaseUrl}/${webhookReceiverId}`;
  const headers = {"X-UP-JS-Test": "Hello world!"};
  const version = '1.2';
  const status = 'ACTIVE';
  const name = webhookReceiverId;
  const hmacSecretKey = cryptoRandomString({length: 32, type: 'distinguishable'});

  let webhook;
  try {
    webhook = await api.webhooks.create(url, headers, version, status, name, hmacSecretKey, eventFilters);
  }
  catch (error) {
    tErrorFail(t, error, 'Creating the webhook failed.');
    return { webhook: null, matcher: null };
  }
  t.comment('Inspecting created webhook.');
  inspect(webhook);

  const genericWebhookMatcher = (body, simpleHeaders, rawHeaders, metaData) => {
    const webhookPayload = JSON.parse(body);
    if (metaData.webhookId != webhookReceiverId) {
      // Only match the webhook created above.
      return false;
    }

    const signatureHeader = simpleHeaders['X-Up-Signature'];
    t.ok(signatureHeader, 'Found webhook HMAC signature header');
    const hmac = crypto.createHmac('sha256', hmacSecretKey).update(body, 'utf8').digest('hex');
    t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

    t.equal(webhookPayload.webhook_id, webhook.id, 'Received Webhook has same API ID as the webhook created just now.');

    // // Disabled because Upvest API is not sending out those headers yet.
    // // TODO Re-enable when API is processing headers
    // t.comment('Inspecting received headers.');
    // inspect(simpleHeaders);
    // for (const [headerName, headerValue] of Object.entries(headers)) {
    //   t.equal(simpleHeaders[headerName], headerValue, 'Specified webhook headers are present');
    // }

    if (typeof specificWebhookMatcher == 'function') {
      return specificWebhookMatcher(t, webhookPayload);
    }

    return true;
  }

  return { webhook, matcher: genericWebhookMatcher };
}


module.exports = {
  tErrorFail, tGetCachedOrCreateUser, tCreateUser, tEcho, tCreateWallets,
  tWaitForWalletActivation, tWaitForBalanceUpdate, tIsRecoveryKitValid,
  tEthereumSigning,
  setTimeoutPromise,
  tVerifyDynamicWebhookBaseUrl,
  tCreateDynamicWebhookWithMatcher,
};
