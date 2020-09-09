const Web3 = require('web3');

// Try to pool web socket connections.

// See https://github.com/ethereum/web3.js/tree/1.x/packages/web3-providers-ws#usage
const defaultWebsocketProviderOptions = {
  timeout: 30000, // ms

  // // Useful for credentialed urls, e.g: ws://username:password@localhost:8546
  // headers: {
  //   authorization: 'Basic username:password'
  // },

  clientConfig: {
    // Useful if requests are large
    maxReceivedFrameSize: 100000000,   // bytes - default: 1MiB
    maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

    // Useful to keep a connection alive
    keepalive: true,
    keepaliveInterval: 60000, // ms
  },

  // Enable auto reconnection
  reconnect: {
    auto: true,
    delay: 5000, // ms
    maxAttempts: 15,
    onTimeout: true,
  }
};

const web3Pool = new Map();

function getWeb3(infuraProjectId, netName='ropsten') {
  // mainnet does use `mainnet.infura.io` as domain name, not `infura.io`
  const url = `wss://${netName}.infura.io/ws/v3/${infuraProjectId}`;
  if (! web3Pool.has(url)) {
    const provider = new Web3.providers.WebsocketProvider(url, defaultWebsocketProviderOptions);
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
