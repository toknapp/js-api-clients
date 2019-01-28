const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const test = require('tape');
const xmlParser = require('fast-xml-parser');

const cryptoRandomString = require('crypto-random-string');

const { EthereumAndErc20Faucet } = require('../faucet.js');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const {
  inspect, tErrorFail, tGetCachedOrCreateUser, tCreateUser, tEcho,
  tCreateWallets, tWaitForWalletActivation, readlineQuestionPromise,
} = require('../util.js');

const { test_config } = require('./cli-options.js');

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_config.first_apikey.key,
  test_config.first_apikey.secret,
  test_config.first_apikey.passphrase_last_chance_to_see,
);

const getClienteleAPI = (username, password) => new UpvestClienteleAPI(
  test_config.baseURL,
  test_config.first_oauth2_client.client_id,
  test_config.first_oauth2_client.client_secret,
  username,
  password
);

test('Testing echo endpoint', async function (t) {
  const echo = await tenancy.echo('hello');
  // console.dir(echo, {depth:null, colors:true});
  t.equal(echo, 'hello', 'actual and expected echo are equal');
  t.end();
});

test('Testing users.create()', async function (t) {
  const { username, password, recoverykit } = await tCreateUser(t, tenancy);
  if (! username) return;

  const isRecoveryKitValidXml = (xmlParser.validate(recoverykit) === true);
  t.ok(isRecoveryKitValidXml, 'Recovery Kit is valid XML');
  if (isRecoveryKitValidXml) {
    let jsonObj;
    try {
      jsonObj = xmlParser.parse(recoverykit, {ignoreAttributes:false});
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
  t.end();
});

test('Testing users.list()', async function (t) {
  const PAGE_LENGTH = 2;
  const NUMBER_OF_USERS = (3 * PAGE_LENGTH);
  const usernames = new Set();

  for await (const user of tenancy.users.list()) {
    usernames.add(user.username);
  }

  const numberOfUsersToCreate = NUMBER_OF_USERS - usernames.size;
  const userPromises = [];
  for (let i = 0; i < numberOfUsersToCreate; i++) {
    userPromises.push(tCreateUser(t, tenancy));
  }
  const userResults = await Promise.all(userPromises);
  for (const { username, password } of userResults) {
    if (username === null) return;
    usernames.add(username);
  }

  t.comment('Test listing all users and retrieving each one of them.')
  for await (const user of tenancy.users.list(PAGE_LENGTH)) {
    let retrievedUser;
    try {
      retrievedUser = await tenancy.users.retrieve(user.username);
    }
    catch (error) {
      return tErrorFail(t, error, 'Retrieving the user failed.');
    }
    t.ok(usernames.has(retrievedUser.username), 'Retrieved user is "known" in our list of existing or created test users.');
  }

  // TODO Figure out a way of changing the underlying list without deleting
  // users which have been used for Tx testing and therefore have potentially
  // stuck funds to recover.

  // t.comment('Test listing all users and deleting each one of them, thereby changing the underlying list.')
  // for await (const user of tenancy.users.list()) {
  //   let isDeleted;
  //   try {
  //     isDeleted = await tenancy.users.delete(user.username);
  //   }
  //   catch (error) {
  //     return tErrorFail(t, error, 'Deleting the user failed.');
  //   }
  //   t.ok(isDeleted, 'Deleted user successfully.');
  //   t.ok(usernames.delete(user.username), 'Deleted user was "known" in our list of created test users.');
  // }
  // t.equal(usernames.size, 0, 'No left-overs, all users of our list of created users were successfully deleted.');

  t.end();
});

test('Testing users.updatePassword()', async function (t) {
  let echoSuccess;
  const { username, password } = await tCreateUser(t, tenancy);
  if (! username) return;

  t.comment('See if OAuth2 with original password works.');
  echoSuccess = await tEcho(t, getClienteleAPI(username, password));
  if (! echoSuccess) return;

  await tWaitForWalletActivation(t, getClienteleAPI(username, password));

  const newPassword = cryptoRandomString(10);

  let isUpdated;
  try {
    isUpdated = await tenancy.users.updatePassword(username, password, newPassword);
  }
  catch (error) {
    return tErrorFail(t, error, 'Updating the password failed.');
  }
  t.ok(isUpdated, 'The user password was updated.');

  try {
    echo = await getClienteleAPI(username, password).echo('all good');
    t.fail('OAuth2 with original password should have failed, but did not.');
  }
  catch (error) {
    t.equal(error.response.status, 401, 'OAuth2 with original password fails with status 401.');
    t.equal(error.response.data.error, 'invalid_grant', 'OAuth2 with original password fails with error code "invalid_grant".');
  }

  t.comment('See if OAuth2 with new password works.');
  echoSuccess = await tEcho(t, getClienteleAPI(username, newPassword));
  if (! echoSuccess) return;

  t.end();
});

test('Testing users.delete()', async function (t) {
  const { username, password } = await tCreateUser(t, tenancy);
  if (! username) return;

  let isDeleted;
  try {
    isDeleted = await tenancy.users.delete(username);
  }
  catch (error) {
    return tErrorFail(t, error, 'Deleting the user failed.');
  }

  t.ok(isDeleted, 'The user was deleted.');

  t.end();
});


test('Testing wallets.list() and wallets.retrieve()', async function (t) {

  t.comment('Test listing all wallets of the tenant, and retrieving each one of them.')
  for await (const wallet of tenancy.wallets.list()) {
    // console.log('Inspecting listed wallet:');
    // inspect(wallet);
    let retrievedWallet;
    try {
      retrievedWallet = await tenancy.wallets.retrieve(wallet.id);
    }
    catch (error) {
      return tErrorFail(t, error, 'Retrieving the wallet failed.');
    }
    // console.log('Inspecting retrieved wallet:');
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
