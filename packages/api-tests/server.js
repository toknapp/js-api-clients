const cryptoRandomString = require('crypto-random-string');

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');

const test_config = require('./.test_config.json');
const test_tenant = require('./.test_tenant.json');
const { inspect, inspectError } = require('./util.js');

const express = require('express');
const opn = require('opn');

const PORT = 3000;

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_tenant.first_apikey.key,
  test_tenant.first_apikey.secret,
  test_tenant.first_apikey.passphrase_last_chance_to_see,
  // true
);

const main = async function () {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    console.log('Error creating user.');
    inspectError(error);
    return;
  }

  const testUserCredentials = {
    username,
    password,
    oauth2ClientId:test_tenant.first_oauth2_client.client_id,
    baseURL:test_config.baseURL,
  };

  inspect(testUserCredentials);

  const app = express();

  app.use(express.static(__dirname + '/browser/'));

  app.get('/test-credentials', function (req, res) {
    res.send(JSON.stringify(testUserCredentials));
  });

  app.listen(PORT, async () => {
    opn(`http://localhost:${PORT}/index.html`);
  });
};

main();
