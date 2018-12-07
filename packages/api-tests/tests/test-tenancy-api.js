const test = require('tape');
var xmlParser = require('fast-xml-parser');

const cryptoRandomString = require('crypto-random-string');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const { tErrorFail } = require('../util.js');

const test_config = require('../.test_config.json');

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

// Delete all previous test users.
async function deleteAllTestUsers() {
  for await (const user of tenancy.users.list()) {
    try {
      const response = await tenancy.users.delete(user.username);
    }
    catch (error) {
      tErrorFail(t, error, `Deleting test user "${user.username}" failed.`);
    }
  }
}

test('Running deleteAllTestUsers() first', async function (t) {
  await deleteAllTestUsers();
  t.end();
});

test('Testing echo endpoint', async function (t) {
  const echo = await tenancy.echo('hello');
  // console.dir(echo, {depth:null, colors:true});
  t.equal(echo, 'hello', 'actual and expected echo are equal');
  t.end();
});

test('Testing users.create()', async function (t) {
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
  const isRecoveryKitValidXml = (xmlParser.validate(user.recoverykit) === true);
  t.ok(isRecoveryKitValidXml, 'Recovery Kit is valid XML');
  if (isRecoveryKitValidXml) {
    let jsonObj;
    try {
      jsonObj = xmlParser.parse(user.recoverykit, {ignoreAttributes:false});
      t.ok('svg' in jsonObj, 'Recovery Kit SVG has <svg> root element.');
      t.ok('path' in jsonObj['svg'], 'SVG has <path> element.');
      t.ok('@_d' in jsonObj['svg']['path'], 'SVG <path> element has "d" attribute.');
      t.ok('@_id' in jsonObj['svg']['path'], 'SVG <path> element has "id" attribute.');
      t.equal(jsonObj['svg']['path']['@_id'], 'qr-path', '"id" attribute is "qr-path"');
    }
    catch (parseError) {
      return tErrorFail(t, error, 'Parsing the SVG as XML failed.');
    }
    // console.dir(jsonObj, {depth:null, colors:true});
  }
  t.end();
});

test('Testing users.list()', async function (t) {
  const PAGE_LENGTH = 2;
  const NUMBER_OF_USERS = (3 * PAGE_LENGTH);
  const usernames = new Set();

  // Start with clean slate.
  await deleteAllTestUsers();

  for (let i = 0; i < NUMBER_OF_USERS; i++) {
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
    usernames.add(user.username);
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
    t.ok(usernames.has(retrievedUser.username), 'Retrieved user is "known" in our list of created test users.');
  }

  t.comment('Test listing all users and deleting each one of them, thereby changing the underlying list.')
  for await (const user of tenancy.users.list()) {
    let isDeleted;
    try {
      isDeleted = await tenancy.users.delete(user.username);
    }
    catch (error) {
      return tErrorFail(t, error, 'Deleting the user failed.');
    }
    t.ok(isDeleted, 'Deleted user successfully.');
    t.ok(usernames.delete(user.username), 'Deleted user was "known" in our list of created test users.');
  }
  t.equal(usernames.size, 0, 'No left-overs, all users of our list of created users were successfully deleted.');

  t.end();
});

test('Testing users.updatePassword()', async function (t) {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  let echo;

  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    return tErrorFail(t, error, 'Creating the user failed.');
  }

  t.equal(user.username, username, 'actual and expected username are equal');

  try {
    echo = await getClienteleAPI(username, password).echo('all good');
  }
  catch (error) {
    return tErrorFail(t, error, 'Either obtaining the OAuth2 token or calling the echo endpoint failed.');
  }
  t.equal(echo, 'all good', 'OAuth2 with original password works.');

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
  }
  catch (error) {
    t.equal(error.response.status, 401, 'OAuth2 with original password fails with status 401.');
    t.equal(error.response.data.error, 'invalid_grant', 'OAuth2 with original password fails with error code "invalid_grant".');
  }

  try {
    echo = await getClienteleAPI(username, newPassword).echo('all good');
  }
  catch (error) {
    return tErrorFail(t, error, 'Either obtaining the OAuth2 token or calling the echo endpoint failed.');
  }
  t.equal(echo, 'all good', 'OAuth2 with new password works.');

  t.end();
});

test('Testing users.delete()', async function (t) {
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

  t.comment('Test listing all wallets of one user, and retrieving each one of them.')
  for await (const wallet of tenancy.wallets.list()) {
    // console.log('Inspecting listed wallet:');
    // inspect(wallet);
    let retrievedWallet;
    try {
      retrievedWallet = await tenancy.wallets.retrieve(wallet.uuid);
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
