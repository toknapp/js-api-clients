const test = require('tape');

const cryptoRandomString = require('crypto-random-string');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const { inspect, tErrorFail } = require('../util.js');

const test_config = require('../.test_config.json');

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_config.first_apikey.key,
  test_config.first_apikey.secret,
  test_config.first_apikey.passphrase_last_chance_to_see,
  // true
);


test('Testing valid OAuth2 credentials succeed', async function (t) {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the user failed.');
  }

  t.equal(user.username, username, 'actual and expected username are equal');

  const clientele = new UpvestClienteleAPI(
    test_config.baseURL,
    test_config.first_oauth2_client.client_id,
    test_config.first_oauth2_client.client_secret,
    username,
    password
  );

  let echo;
  try {
    echo = await clientele.echo('Hi there!');
  }
  catch (error) {
    return tErrorFail(t, error, 'Either obtaining the OAuth2 token or calling the echo endpoint failed.');
  }

  t.equal(echo, 'Hi there!', 'actual and expected OAuth2 echo are equal');
  t.end();
});


test('Testing invalid OAuth2 credentials fail', async function (t) {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the user failed.');
  }

  t.equal(user.username, username, 'actual and expected username are equal');

  const variants_of_missing = [
    [{username: null,     password: null},     400, 'invalid_request'],
    [{username: username, password: null},     400, 'invalid_request'],
    [{username: null,     password: password}, 400, 'invalid_request'],
    [{username: username, password: 'wrong'},  401, 'invalid_grant'],
    [{username: 'wrong',  password: password}, 401, 'invalid_grant'],
    [{username: 'wrong',  password: 'wrong'},  401, 'invalid_grant'],
  ];

  for (const [{username, password}, expectedStatus, expectedCode] of variants_of_missing) {
    const clientele = new UpvestClienteleAPI(
      test_config.baseURL,
      test_config.first_oauth2_client.client_id,
      test_config.first_oauth2_client.client_secret,
      username,
      password
    );

    let echo;
    try {
      echo = await clientele.echo('Hi there!');
    }
    catch (error) {
      t.equal(error.response.status, expectedStatus, `Response status is ${expectedStatus}.`);
      t.equal(error.response.data.error, expectedCode, `Response error code is "${expectedCode}"`);
    }
  }

  t.end();
});


test('Testing OAuth2 echo endpoint', async function (t) {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the user failed.');
  }

  t.equal(user.username, username, 'actual and expected username are equal');

  const clientele = new UpvestClienteleAPI(
    test_config.baseURL,
    test_config.first_oauth2_client.client_id,
    test_config.first_oauth2_client.client_secret,
    username,
    password
  );

  let echo;
  try {
    echo = await clientele.echo('Hi there!');
  }
  catch (error) {
    return tErrorFail(t, error, 'Either obtaining the OAuth2 token or calling the echo endpoint failed.');
  }

  // console.dir(echo, {depth:null, colors:true});
  t.equal(echo, 'Hi there!', 'actual and expected OAuth2 echo are equal');
  t.end();
});


test('Testing wallets.list() and wallets.retrieve()', async function (t) {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the user failed.');
  }

  t.equal(user.username, username, 'actual and expected username are equal');

  const clientele = new UpvestClienteleAPI(
    test_config.baseURL,
    test_config.first_oauth2_client.client_id,
    test_config.first_oauth2_client.client_secret,
    username,
    password
  );

  t.comment('Test listing all wallets of one user, and retrieving each one of them.')
  for await (const wallet of clientele.wallets.list()) {
    // console.log('Inspecting listed wallet:');
    // inspect(wallet);
    let retrievedWallet;
    try {
      retrievedWallet = await clientele.wallets.retrieve(wallet.uuid);
    }
    catch (error) {
      return tErrorFail(t, error, 'Retrieving the wallet failed.');
    }
    // console.log('Inspecting retrieved wallet:');
    // inspect(retrievedWallet);

    // { uuid: '2cdd8256-d5aa-48ee-a76b-6a9a88349c2e',
    //   asset:
    //    { name: 'Ethereum',
    //      symbol: 'ETH',
    //      exponent: 18,
    //      protocol: 'co.upvest.kinds.Ethereum' },
    //   address: null,
    //   balance: '0',
    //   status: 'PENDING' }

    t.equal(wallet.uuid, retrievedWallet.uuid, 'listed and retrieved wallet.uuid are equal');
    t.ok(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(wallet.uuid), 'wallet.uuid matches UUID pattern');

    t.equal(wallet.asset.name, retrievedWallet.asset.name, 'listed and retrieved wallet.asset.name are equal');
    t.equal(wallet.asset.symbol, retrievedWallet.asset.symbol, 'listed and retrieved wallet.asset.symbol are equal');

    t.equal(wallet.asset.exponent, retrievedWallet.asset.exponent, 'listed and retrieved wallet.asset.exponent are equal');
    t.equal(typeof wallet.asset.exponent, 'number', 'wallet.asset.exponent is a number');

    t.equal(wallet.asset.protocol, retrievedWallet.asset.protocol, 'listed and retrieved wallet.asset.protocol are equal');
    t.ok(wallet.asset.protocol.startsWith('co.upvest.kinds.'), 'wallet.asset.protocol starts with "co.upvest.kinds."');

    t.equal(wallet.address, retrievedWallet.address, 'listed and retrieved wallet.address are equal');

    t.equal(wallet.balance, retrievedWallet.balance, 'listed and retrieved wallet.balance are equal');
    // t.equal(typeof wallet.balance, 'number', 'wallet.balance is a number');
    // t.ok(wallet.balance >= 0, 'wallet.balance is not negative');

    t.equal(wallet.status, retrievedWallet.status, 'listed and retrieved wallet.status are equal');

    const walletStates = new Set(['PENDING', 'ACTIVE']);
    t.ok(walletStates.has(wallet.status), 'wallet.status is one of "PENDING" or "ACTIVE".');
  }

  t.end();
});
