const Web3 = require('web3');

// Try to pool web socket connections.

const web3Pool = new Map();

function getWeb3(infuraProjectId, netName='ropsten') {
  // mainnet does use `mainnet.infura.io` as domain name, not `infura.io`
  const url = `wss://${netName}.infura.io/ws/v3/${infuraProjectId}`;
  if (! web3Pool.has(url)) {
    const provider = new Web3.providers.WebsocketProvider(url);
    web3Pool.set(url, new Web3(provider));
  }
  return web3Pool.get(url);
}

function disconnectAll() {
  for (const web3 of web3Pool.values()) {
    if (web3.currentProvider) {
      web3.currentProvider.disconnect();
    }
  }
  // Do not keep disconnected providers around. If need be, re-create them,
  // which will also re-connect them.
  web3Pool.clear();
}


module.exports = { getWeb3, disconnectAll };
