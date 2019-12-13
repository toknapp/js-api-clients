const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const {test, inspect} = testenv;

const protocol = 'ethereum';
const network = 'ropsten';

test('Test retrieve block details', async function(t) {
  t.comment('Test retrieving latest block number.');
  const block_number = '6570890';
  let block;
  try {
    block = await testenv.tenancy.historical.get_block(protocol, network, block);
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the block failed.');
  }

  t.ok(block.number, 'block number for latest block is set');

  t.comment('Test retrieving specific block number.');
  const block_number = 6570890;
  let block;
  try {
    block = await testenv.tenancy.historical.get_block(protocol, network, block);
  } catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the block failed.');
  }

  t.equal(block.number, block_number, 'block.number matches expected block number');

  t.end();
});
