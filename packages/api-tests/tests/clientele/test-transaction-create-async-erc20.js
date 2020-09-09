const testenv = require('../../testenv.js');
const { TxSenderErc20 } = require('../../tx-sender-erc20.js');

// Shortcuts to most-used facilities.
const { test } = testenv;


test('Testing async ERC20 transactions.create() with faucet', async t => {
  const sender = new TxSenderErc20(testenv.config, t, {parallel:testenv.parallel});
  await sender.ready;
  await sender.run();
});
