// copied from ../tests/test-clientele-api.js

// const test = require('tape');

const cryptoRandomString = require('crypto-random-string');

const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const { tErrorFail } = require('./util.js');

const main = async function (t) {
  const {baseURL, oauth2ClientId, username, password} = await fetch('/test-credentials').then(res => res.json());

  const clientele = new UpvestClienteleAPI(
    baseURL,
    oauth2ClientId,
    '',
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
