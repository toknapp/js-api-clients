const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing that invalid OAuth2 credentials fail', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  const variantsOfMissing = [
    [{username: null,     password: null},     400, 'invalid_request'],
    [{username: username, password: null},     400, 'invalid_request'],
    [{username: null,     password: password}, 400, 'invalid_request'],
    [{username: username, password: 'wrong'},  401, 'invalid_grant'],
    [{username: 'wrong',  password: password}, 401, 'invalid_grant'],
    [{username: 'wrong',  password: 'wrong'},  401, 'invalid_grant'],
  ];

  for (const [{username, password}, expectedStatus, expectedCode] of variantsOfMissing) {
    const clientele = testenv.getClienteleAPI(username, password);

    let echo;
    try {
      echo = await clientele.echo('Hi there!');
      t.fail('OAuth2 with invalid credentials should have failed, but did not.');
    }
    catch (error) {
      t.equal(error.response.status, expectedStatus, `Response status is ${expectedStatus}.`);
      t.equal(error.response.data.error, expectedCode, `Response error code is "${expectedCode}"`);
    }
  }

  t.end();
});
