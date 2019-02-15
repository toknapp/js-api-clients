const { toBN } = require('web3-utils');

const erc20ABI = require('./erc20-abi.json');
const minimalTransferABI = erc20ABI.filter(abi => (abi.type == 'function') && (abi.name == 'transfer'))[0];

const web3Pool = require('./web3-pool.js');

async function prepareTxSendEther(web3, sender, recipient, amount, gasPrice=3.5e9, nonce=null) {
  const GAS_LIMIT_ETH_TRANSFER = 21000;
  const gasLimit = toBN(GAS_LIMIT_ETH_TRANSFER);
  gasPrice = toBN(gasPrice);
  const gasCost = gasLimit.mul(gasPrice);

  if (! nonce) {
    nonce = await web3.eth.getTransactionCount(sender);
  }
  const balance = toBN(await web3.eth.getBalance(sender));

  amount = toBN(amount);

  if (balance.lt(amount.add(gasCost))) {
    throw Error('Insufficient funds.');
  }

  return {
    value: toBN(amount),
    to: recipient,
    nonce: toBN(nonce),
    gas: gasLimit,
    gasPrice: gasPrice,
  };
}

async function prepareTxTransferErc20(web3, contract, sender, recipient, amount, gasPrice=3.5e9, gasLimit=51241, nonce=null) {
  const transferCall = web3.eth.abi.encodeFunctionCall(minimalTransferABI, [recipient, toBN(amount).toString(10)]);
  if (! nonce) {
    nonce = await web3.eth.getTransactionCount(sender);
  }
  return {
    data: transferCall,
    to: contract,
    nonce: toBN(nonce),
    gas: toBN(gasLimit),
    gasPrice: toBN(gasPrice),
  };
}

function sendTx(web3, rawTransaction, confirmationThreshold, logger) {
  if (! logger) logger = msg => undefined;
  return new Promise(function promiseExecutor(resolvePromise, rejectPromise) {
    let rejectionReceipt = null;

    web3.eth.sendSignedTransaction(rawTransaction)
    .on('confirmation', function(confirmationNumber, receipt) {
      logger(`confirmation number: ${confirmationNumber}`);
      if (! receipt.status) {
        rejectionReceipt = receipt;
      }

      if (Number(confirmationNumber) >= confirmationThreshold) {
        const transactionHash = receipt.transactionHash;
        const transactionStatus = receipt.status;
        const transactionReceipt = receipt;

        resolvePromise({
          success: true,
          confirmationNumber,
          transactionHash,
          transactionStatus,
          transactionReceipt,
        });
      }
    })
    .on('error', function(error) {
      rejectPromise({success: false, error, rejectionReceipt});
    });
  });
}

function ensureHexPrefix(hexString) {
  return (hexString.substr(0, 2) === '0x') ? hexString : '0x' + hexString;
}


class EthereumAndErc20Faucet {
  constructor(config) {
    this.config = config;
    this.web3 = web3Pool.getWeb3(this.config.infuraProjectId, this.config.netName);
  }

  async getInitialNonce() {
    return toBN(await this.web3.eth.getTransactionCount(this.config.holder.address));
  }

  async signAndSend(tx, logger) {
    if (! logger) logger = msg => undefined;
    const key = ensureHexPrefix(this.config.holder.key);
    const signedTxBundle = await this.web3.eth.accounts.signTransaction(tx, key);
    try {
      return await sendTx(this.web3, signedTxBundle.rawTransaction, this.config.confirmationThreshold, logger);
    }
    catch (error) {
      // TODO Re-think error handling.
      return error;
    }
  }

  async faucetEth(recipient, amount, nonce, logger) {
    const txSendEther = await prepareTxSendEther(
      this.web3,
      this.config.holder.address,
      recipient,
      toBN(amount),
      this.config.gasPrice,
      nonce
    );
    return await this.signAndSend(txSendEther, logger);
  }

  async faucetErc20(recipient, amount, nonce, logger) {
    const txTransferErc20 = await prepareTxTransferErc20(
      this.web3,
      this.config.erc20.contract,
      this.config.holder.address,
      recipient,
      toBN(amount),
      this.config.gasPrice,
      this.config.erc20.gasLimit,
      nonce
    );
    return await this.signAndSend(txTransferErc20, logger);
  }

  async run(recipient, ethAmount, erc20Amount, logger) {
    if (! logger) logger = msg => undefined;

    const initialNonce = await this.getInitialNonce();

    let faucets;
    if (this.config.ethEnabled) {
      faucets = [
        this.faucetEth(recipient, ethAmount, initialNonce, msg => logger(`ETH faucet: ${msg}`)),
        this.faucetErc20(recipient, erc20Amount, initialNonce.add(toBN(1)), msg => logger(`ERC20 faucet: ${msg}`))
      ];
    }
    else {
      faucets = [
        this.faucetErc20(recipient, erc20Amount, initialNonce, msg => logger(`ERC20 faucet: ${msg}`))
      ];
    }

    return await Promise.all(faucets);
  }

  // Without disconnecting, the web socket connection will keep the Node.js process running beyond test completion.
  disconnect() {
    web3Pool.disconnectAll();
  }
}


module.exports = { EthereumAndErc20Faucet };
