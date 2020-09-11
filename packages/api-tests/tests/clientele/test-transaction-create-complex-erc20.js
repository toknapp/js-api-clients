const testenv = require('../../testenv.js');
const { TxSenderComplex } = require('../../tx-sender-complex.js');

// Shortcuts to most-used facilities.
const { test } = testenv;

async function main() {
  const feeCfgs = [
    {},
    { gasLimit: 'default' },
    { gasPrice: 'default' },
    { gasPrice: 'default', gasLimit: 'default' },
    { gasPrice: 'fastest' },
    { gasPrice: 'fastest', gasLimit: 'default' },
  ];
  for (const feeCfg of feeCfgs) {
    test(`Testing complex transactions.create() with feecfg: ${JSON.stringify(feeCfg)}`, async t => {
      const sender = new TxSenderComplex(testenv.config, t, {parallel:testenv.parallel, feeCfg});
      await sender.ready;
      await sender.run();
    });
  }
}

main();
