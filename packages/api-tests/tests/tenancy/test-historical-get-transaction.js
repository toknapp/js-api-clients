const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test retrieve single transaction by txhash', async function(t) {
  const txhash = '0xa313aaad0b9b1fd356f7f42ccff1fa385a2f7c2585e0cf1e0fb6814d8bdb559a';
  let tx;
  try {
    tx = await testenv.tenancy.historical.get_transaction(protocol, network, txhash);
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the transaction failed.');
  }

  t.equal(tx.hash, txhash.slice(2), 'Transaction match');

  t.end();
});
