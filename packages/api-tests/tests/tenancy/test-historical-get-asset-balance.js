const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test retrieve native asset balance by address', async function(t) {
  const to_addr = '0x93b3d0b2894e99c2934bed8586ea4e2b94ce6bfd';
  let balance;
  try {
    balance = await testenv.tenancy.historical.get_asset_balance(protocol, network, to_addr);
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the asset balance failed.');
  }

  t.ok(balance.address, 'balance has address field');
  t.equal(balance.contract, undefined, 'Asset balance contract is null as expected');
  t.equal(balance.address, to_addr, 'Asset address matches');

  t.end();
});
