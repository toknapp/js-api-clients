const test = require('tape');

const cryptoRandomString = require('crypto-random-string');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

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
    test_tenant.first_oauth2_client.client_id,
    test_tenant.first_oauth2_client.client_secret,
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
