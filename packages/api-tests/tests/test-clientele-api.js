const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const test = require('tape');

const cryptoRandomString = require('crypto-random-string');

const { EthereumAndErc20Faucet } = require('../faucet.js');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const { inspect, tErrorFail } = require('../util.js');

const { test_config } = require('./cli-options.js');

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_config.first_apikey.key,
  test_config.first_apikey.secret,
  test_config.first_apikey.passphrase_last_chance_to_see,
  // true
);

const getClienteleAPI = (username, password) => new UpvestClienteleAPI(
  test_config.baseURL,
  test_config.first_oauth2_client.client_id,
  test_config.first_oauth2_client.client_secret,
  username,
  password
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

  // t.comment('Inspecting echo:');
  // inspect(echo);
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
    // t.comment('Inspecting listed wallet:');
    // inspect(wallet);
    let retrievedWallet;
    try {
      retrievedWallet = await clientele.wallets.retrieve(wallet.id);
    }
    catch (error) {
      return tErrorFail(t, error, 'Retrieving the wallet failed.');
    }
    // t.comment('Inspecting retrieved wallet:');
    // inspect(retrievedWallet);

    // { id: '3e10efd9-72ce-4247-8bd9-50b9d14e1b27',
    //   address: '0x5eD17929FD017F98479c95A26ba1AA03bcF4628F',
    //   balances:
    //    [ { amount: '0', name: 'Ethereum', symbol: 'ETH', exponent: 18 } ],
    //   protocol: 'co.upvest.kinds.Ethereum',
    //   status: 'ACTIVE' }

    t.equal(wallet.id, retrievedWallet.id, 'listed and retrieved wallet.id are equal');
    t.ok(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(wallet.id), 'wallet.id matches UUID pattern');

    wallet.balances.forEach(function callback(balance, index) {
      const retrievedBalance = retrievedWallet.balances[index];
      t.equal(balance.name, retrievedBalance.name, 'listed and retrieved balance.name are equal');
      t.equal(balance.symbol, retrievedBalance.symbol, 'listed and retrieved balance.symbol are equal');
      t.equal(balance.exponent, retrievedBalance.exponent, 'listed and retrieved balance.exponent are equal');
      t.equal(typeof balance.exponent, 'number', 'balance.exponent is a number');
      t.equal(balance.amount, retrievedBalance.amount, 'listed and retrieved balance.amount are equal');
      t.equal(typeof balance.amount, 'string', 'balance.amount is a string (to deal with numbers > 2**53)');
    });

    t.equal(wallet.protocol, retrievedWallet.protocol, 'listed and retrieved wallet.protocol are equal');
    t.ok(wallet.protocol.startsWith('co.upvest.kinds.'), 'wallet.protocol starts with "co.upvest.kinds."');

    t.equal(wallet.address, retrievedWallet.address, 'listed and retrieved wallet.address are equal');

    t.equal(wallet.status, retrievedWallet.status, 'listed and retrieved wallet.status are equal');

    const walletStates = new Set(['PENDING', 'ACTIVE']);
    t.ok(walletStates.has(wallet.status), 'wallet.status is one of "PENDING" or "ACTIVE".');
  }

  t.end();
});

test('Testing transactions.create()', async function (t) {
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

  t.comment('Wait for seed generation.')
  // Poll user's wallets to see when seed generation has finished. Prefer
  // polling over the API Key callback, because this test script might run in
  // places which are not able to receive callbacks.
  const MAX_WAIT = 3 * 60;
  const waitingForGenSeed = getClienteleAPI(username, password);
  let isGenSeedFinished;
  let secondsWaitedForGenSeed = 0;
  do {
    isGenSeedFinished = true;
    for await (const wallet of waitingForGenSeed.wallets.list()) {
      t.comment(`Waited ${secondsWaitedForGenSeed} seconds.`);
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
    secondsWaitedForGenSeed++;
  }
  while (! isGenSeedFinished && secondsWaitedForGenSeed < MAX_WAIT);
  t.ok(secondsWaitedForGenSeed < MAX_WAIT, `Waited less than ${MAX_WAIT} seconds for seed generation.`);

  const GRACE_PERIOD = 10;
  await setTimeoutPromise(GRACE_PERIOD * 1000);

  const clientele = getClienteleAPI(username, password);

  t.comment('Test listing all wallets of one user, and generating a transaction for those wallets which are Ethereum or Erc20 wallets.')
  for await (const wallet of clientele.wallets.list()) {
    // Only test Tx creation for ETH.
    if (-1 === ['co.upvest.kinds.Ethereum', 'co.upvest.kinds.Erc20'].indexOf(wallet.protocol)) {
      continue;
    }

    t.comment('Inspecting listed wallet:');
    inspect(wallet);

    // transfer ETH and ERC20 funds from testnet faucet to wallet.address
    let faucetConfig;
    if (('faucet' in test_config) && ('ethereum' in test_config.faucet)) {
      faucetConfig = test_config.faucet.ethereum;
      inspect('User credentials, in case the faucetting and/or test Tx fails:', {username, password});
      t.comment('Create faucet.')
      const faucet = new EthereumAndErc20Faucet(faucetConfig);
      t.comment('Faucet some ETH to new wallet.')
      const faucetResultsEth = await faucet.faucetEth(wallet.address, faucetConfig.gasPrice * faucetConfig.erc20.gasLimit);
      inspect('faucetResultsEth ==', faucetResultsEth);
      t.comment('Faucet some ERC20 tokens to new wallet.')
      const faucetResultsErc20 = await faucet.faucetErc20(wallet.address, faucetConfig.erc20.amount);
      inspect('faucetResultsErc20 ==', faucetResultsErc20);
      faucet.disconnect();
    }
    else {
      // Even without running an actual faucet, we are still using some faucet
      // config values in the test Tx. Just use the example config for that.
      faucetConfig = require('../example.test_config.json').faucet.ethereum;
    }

    let tx;
    try {
      tx = await await clientele.transactions.create(
        wallet.id,
        password,
        recipient=faucetConfig.holder.address,
        symbol=faucetConfig.erc20.symbol,
        quantity=faucetConfig.erc20.amount,
        fee=(faucetConfig.gasPrice * faucetConfig.erc20.gasLimit)
      );
    }
    catch (error) {
      return tErrorFail(t, error, 'Creating the transaction failed.');
    }

    t.comment('Inspecting result of transaction creation:');
    inspect(tx);

    // { id: '2ca1c534-5c53-4bd7-aabf-b986829ceda3',
    //   txhash:
    //    '9c3ce3ba95da3b4030db8959b6a79ff2b6fd997ccc5cb81f7409b0de345400a1',
    //   sender: null,
    //   recipient: '0x6720d291a72b8673e774a179434c96d21eb85e71',
    //   quantity: '1000000',
    //   fee: '1000' }

  }

  t.end();
});

test.skip('Debug testing of transactions.create() with specific credentials', async function (t) {
  const username = 'abcdef0123';
  const password = '0123abcdef';
  const seedhash = '0123abcdef0123abcdef01';

  const walletId = '0123abcd-cdef-cdef-cdef-012345abcdef';
  const walletAddress = '0x0123456789abcdef0123456789abcdef01234567';

  const faucetConfig = test_config.faucet.ethereum;

  const clientele = getClienteleAPI(username, password);

  let wallet;
  try {
    wallet = await clientele.wallets.retrieve(walletId);
  }
  catch (error) {
    return tErrorFail(t, error, 'Retrieving the wallet failed.');
  }

  t.comment('Inspecting retrieved wallet:');
  inspect(wallet);

  let tx;
  try {
    tx = await await clientele.transactions.create(
      wallet.id,
      password,
      recipient=faucetConfig.holder.address,
      symbol=faucetConfig.erc20.symbol,
      quantity=faucetConfig.erc20.amount,
      fee=(faucetConfig.gasPrice * faucetConfig.erc20.gasLimit)
    );
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the transaction failed.');
  }

  t.comment('Inspecting result of transaction creation:');
  inspect(tx);

  t.end();
});
