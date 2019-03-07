const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing tenancy echo endpoint', async function (t) {
  partials.tEcho(t, testenv.tenancy);
  t.end();
});
