const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test retrieve contract asset balance by address', async function(t) {
  const to_addr = '0x93b3d0b2894e99c2934bed8586ea4e2b94ce6bfd';
  const contract_addr = '0x1d7cf6ad190772cc6177beea2e3ae24cc89b2a10';

  let balance;
  try {
    balance = await testenv.tenancy.historical.get_contract_balance(
      protocol,
      network,
      to_addr,
      contract_addr
    );
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the contract balance failed.');
  }

  t.ok(balance.address, 'balance has address field');
  t.equal(balance.contract, contract_addr, 'Contract balance contract is set');
  t.equal(balance.address, to_addr, 'Contract address matches');

  t.end();
});
