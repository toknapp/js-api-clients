const testenv = require('../../testenv.js');
const { TxSenderEth } = require('../../tx-sender-eth.js');

// Shortcuts to most-used facilities.
const { test } = testenv;


test('Testing async ETH transactions.create() with faucet', async t => {
  const sender = new TxSenderEth(testenv.config, t, {parallel:testenv.parallel});
  await sender.ready;
  await sender.run();
});
