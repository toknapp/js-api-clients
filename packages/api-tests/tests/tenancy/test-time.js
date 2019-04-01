const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing time endpoint', async function (t) {
  let response;
  try {
    response = await testenv.tenancy.client.get('time/');
  }
  catch (error) {
    console.log('Caught error while trying to get current server time.');
    testenv.inspectError(error)
  }
  t.equal(response.status, 200, 'Response status is 200');

  const clientUnixTimestamp = Date.now() / 1000;

  const serverUnixTimestamp = response.data.epoch;
  const timestampDrift = Math.abs(clientUnixTimestamp - serverUnixTimestamp);
  t.ok(timestampDrift < 30, 'Client UNIX timestamp does not drift too far from server UNIX timestamp.');

  const serverTime = Date.parse(response.data.iso8601 + 'Z') / 1000;
  const drift = Math.abs(clientUnixTimestamp - serverTime);
  t.ok(drift < 30, 'Client time does not drift too far from server time.');

  t.end();
});
