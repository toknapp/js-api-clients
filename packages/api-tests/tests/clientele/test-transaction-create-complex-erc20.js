const testenv = require('../../testenv.js');
const { TxSenderComplex } = require('../../tx-sender-complex.js');

// Shortcuts to most-used facilities.
const { test } = testenv;


test('Testing complex transactions.create() with faucet', async t => {
  const sender = new TxSenderComplex(testenv.config, t, {parallel:testenv.parallel});
  await sender.ready;
  await sender.run();
});
