const testenv = require('../../testenv.js');
const { TxSenderRaw } = require('../../tx-sender-raw.js');

// Shortcuts to most-used facilities.
const { test } = testenv;


test('Testing raw transactions.create() with faucet', async t => {
  const sender = new TxSenderRaw(testenv.config, t, {parallel:testenv.parallel});
  await sender.ready;
  await sender.run();
});
