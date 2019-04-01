const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing tenancy echo endpoint', async function (t) {
  await partials.tEcho(t, testenv.tenancy);
  t.end();
});
