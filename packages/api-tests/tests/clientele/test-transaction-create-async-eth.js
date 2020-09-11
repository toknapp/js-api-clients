const testenv = require('../../testenv.js');
const { TxSenderEth } = require('../../tx-sender-eth.js');

// Shortcuts to most-used facilities.
const { test } = testenv;

async function main() {
  const feeCfgs = [
    {},
    { fee: 'default' },
    { gasLimit: 'default' },
    { gasPrice: 'default' },
    { gasPrice: 'default', gasLimit: 'default' },
    { gasPrice: 'fastest' },
    { gasPrice: 'fastest', gasLimit: 'default' },
  ];
  for (const feeCfg of feeCfgs) {
    test(`Testing async ETH transactions.create() with feecfg: ${JSON.stringify(feeCfg)}`, async t => {
      const sender = new TxSenderEth(testenv.config, t, {parallel:testenv.parallel, feeCfg});
      await sender.ready;
      await sender.run();
    });
  }
}

main();
