const testenv = require('../../testenv.js');
const { TxSenderErc20 } = require('../../tx-sender-erc20.js');

// Shortcuts to most-used facilities.
const { test } = testenv;

async function main() {
  const feeCfgs = [
    { fee: 'default' },
    { gasLimit: 'default' },
    { gasPrice: 'default' },
    { gasPrice: 'default', gasLimit: 'default' },
    { gasPrice: 'fastest' },
    { gasPrice: 'fastest', gasLimit: 'default' },
  ];
  for (const feeCfg of feeCfgs) {
    test(`Testing async ERC20 transactions.create() with feecfg: ${JSON.stringify(feeCfg)}`, async t => {
      const sender = new TxSenderErc20(testenv.config, t, {parallel:testenv.parallel, feeCfg});
      await sender.ready;
      await sender.run();
    });
  }
}

main();
