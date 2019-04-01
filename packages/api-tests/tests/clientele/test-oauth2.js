const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing that valid OAuth2 credentials succeed + Testing OAuth2 echo endpoint', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;
  const clientele = testenv.getClienteleAPI(username, password);
  const echoSuccess = await partials.tEcho(t, clientele);
  if (! echoSuccess) return;
  t.end();
});
