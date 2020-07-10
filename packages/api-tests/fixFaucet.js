// const { toBN } = require('web3-utils');

const testenv = require('./testenv.js');
const partials = require('./partials.js');

// Shortcuts to most-used facilities.
const { test, inspect, int2BN } = testenv;

async function fix() {
  const faucetConfig = testenv.config.faucet.ethereum;
  const faucet = new testenv.EthereumAndErc20Faucet(faucetConfig);
  // faucet.currentNonce = int2BN(441);
  const faucetResults = await faucet.faucetErc20(faucetConfig.holder.address, int2BN(faucetConfig.erc20.amount), inspect);
  inspect('faucetResults ==', faucetResults);
  faucet.disconnect();
}

fix();
