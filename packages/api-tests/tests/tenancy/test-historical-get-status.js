const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test retrieve protocol/network status', async function(t) {
  let status;
  try {
    status = await testenv.tenancy.historical.api_status(protocol, network);
  } catch (error) {
    return partials.tErrorFail(t, error, `Retrieving the status for ${protocol} ${network} failed`);
  }

  const statusOK = [status.lowest, status.highest, status.latest].every(
    (el, i, arr) => el !== null
  );

  t.ok(statusOK, `Status for ${protocol} ${network} OK`);

  t.end();
});
