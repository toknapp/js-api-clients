const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test list transactions that have been sent to and received by an address', async function(t) {
  const to_addr = '0x6590896988376a90326cb2f741cb4f8ace1882d5';
  const confirmations = 100;
  const filters = {confirmations: confirmations};

  let txs;
  try {
    txs = await testenv.tenancy.historical.get_transactions(protocol, network, to_addr, filters);
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the transaction failed.');
  }

  t.ok(Array.isArray(txs.result), 'transaction results is an array');

  confirmationsMatch = txs.result.every((el, i, arr) => el.confirmations > confirmations);
  t.ok(confirmationsMatch, 'All transactions to/from ${to_addr} match expected confirmations');

  t.end();
});
