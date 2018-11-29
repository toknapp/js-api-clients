// copied from ../tests/test-clientele-api.js

// const test = require('tape');

const cryptoRandomString = require('crypto-random-string');

const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const { tErrorFail } = require('./util.js');

const test_config = require('../.test_config.json');
const test_tenant = require('../.test_tenant.json');


const main = async function (t) {
  const {username, password} = await fetch('/test-user-credentials').then(res => res.json());

  // console.log(username);
  // console.log(password);

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
};


// Mock "tape" in browser
class Tee {
  equal(a, b, message) {
    console.log(message);
    console.log('IS EQUAL?', a == b);
  }

  end() {
    console.log('END');
  }

  fail(message) {
    console.log('FAIL');
    console.log(message);
  }
}


main(new Tee());
