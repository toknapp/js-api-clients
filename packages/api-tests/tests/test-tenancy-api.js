const test = require('tape');
var xmlParser = require('fast-xml-parser');

const cryptoRandomString = require('crypto-random-string');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');

const { tErrorFail } = require('./util.js');

const test_config = require('../.test_config.json');
const test_tenant = require('../.test_tenant.json');

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_tenant.first_apikey.key,
  test_tenant.first_apikey.secret,
  test_tenant.first_apikey.passphrase_last_chance_to_see,
  // true
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

// TODO re-enable. Too slow for now.
test.skip('Testing users.list()', async function (t) {
  const PAGE_LENGTH = 10;
  const NUMBER_OF_USERS = (3 * PAGE_LENGTH);

  const usernames = [];
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
    usernames.push(user.username);
  }
  console.dir(usernames, {depth:null, colors:true});

  for await (const user of tenancy.users.list()) {
    try {
      const retrievedUser = await tenancy.users.retrieve(user.username);
      console.dir(retrievedUser, {depth:null, colors:true});
    }
    catch (error) {
      return tErrorFail(t, error, 'Retrieving the user failed.');
    }
  }

  t.end();
});

test.skip('Testing users.updatePassword()', async function (t) {
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


  const newPassword = cryptoRandomString(10);

  let updatedUser;
  try {
    updatedUser = await tenancy.users.updatePassword(username, password, newPassword);
  }
  catch (error) {
    return tErrorFail(t, error, 'Updating the password failed.');
  }

  // TODO Figure out how to test for a changed password. Most likely requires OAuth2 to verify.

  // t.equal(updatedUser.username, newUsername, 'actual and expected updated username are equal');

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
