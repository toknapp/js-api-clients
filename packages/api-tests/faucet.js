const { toBN } = require('web3-utils');

const erc20ABI = require('./erc20-abi.json');
const minimalTransferABI = erc20ABI.filter(abi => (abi.type == 'function') && (abi.name == 'transfer'))[0];

const web3Pool = require('./web3-pool.js');

const {
  inspect, inspectError, readlineQuestionPromise,
} = require('./util.js');


async function prepareTxSendEther(web3, sender, recipient, amount, gasPrice=3.5e9, nonce=null) {
  const GAS_LIMIT_ETH_TRANSFER = 21000;
  const gasLimit = toBN(GAS_LIMIT_ETH_TRANSFER);
  gasPrice = toBN(gasPrice);
  const gasCost = gasLimit.mul(gasPrice);

  if (nonce) {
    inspect(`prepareTxSendEther nonce == ${nonce.toString(10)}`);
  }
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
  if (nonce) {
    inspect(`prepareTxTransferErc20 nonce == ${nonce.toString(10)}`);
  }
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
    let removeTxListeners;

    const txPromise = web3.eth.sendSignedTransaction(rawTransaction);

    txPromise.once('transactionHash', transactionHash => logger(`https://${NET_NAME}.etherscan.io/tx/${transactionHash}`));
    txPromise.once('receipt', receipt => logger('receipt:', receipt));

    const txConfirmationListener = function(confirmationNumber, receipt) {
      logger(`confirmation number: ${confirmationNumber}`);
      if (! receipt.status) {
        rejectionReceipt = receipt;
      }

      if (Number(confirmationNumber) >= confirmationThreshold) {
        const transactionHash = receipt.transactionHash;
        const transactionStatus = receipt.status;
        const transactionReceipt = receipt;

        removeTxListeners();
        resolvePromise({
          success: true,
          confirmationNumber,
          transactionHash,
          transactionStatus,
          transactionReceipt,
        });
      }
      else {
        // Keep listening for more confirmations.
        txPromise.once('confirmation', txConfirmationListener);
      }
    };
    txPromise.once('confirmation', txConfirmationListener);

    const txErrorListener = function(error) {
      // removeTxListeners();
      rejectPromise({success: false, error, rejectionReceipt});
    }
    txPromise.once('error', txErrorListener);

    // txPromise.then(removeTxListeners); // This is triggered by the receipt, before we receive additional confirmations (???)
    txPromise.catch(removeTxListeners);
    txPromise.finally(removeTxListeners);

    removeTxListeners = function() {
      txPromise.off('confirmation', txConfirmationListener);
      txPromise.off('error', txErrorListener);
      if (txPromise.removeAllListeners) {
        txPromise.removeAllListeners(); // `.removeAllListeners()` is not documented at https://web3js.readthedocs.io/en/1.0/callbacks-promises-events.html
      }
    };
  });
}

function ensureHexPrefix(hexString) {
  return (hexString.substr(0, 2) === '0x') ? hexString : '0x' + hexString;
}


class EthereumAndErc20Faucet {
  constructor(config) {
    this.config = config;
    this.currentNonce = toBN(0);
  }

  getWeb3() {
    return web3Pool.getWeb3(this.config.infuraProjectId, this.config.netName);
  }

  async syncCurrentNonceFromBlockChain() {
    const blockChainNonce = toBN(await this.getWeb3().eth.getTransactionCount(this.config.holder.address));
    if (blockChainNonce.gt(this.currentNonce)) {
      this.currentNonce = blockChainNonce;
    }
    return this.currentNonce;
  }

  async getCurrentNonce() {
    // Just in case we forgot to sync up before use.
    if (toBN(0).eq(this.currentNonce)) {
      await this.syncCurrentNonceFromBlockChain();
    }
    return this.currentNonce;
  }

  incrementCurrentNonce() {
    this.currentNonce = this.currentNonce.add(toBN(1));
    return this.currentNonce;
  }

  async signAndSend(tx, logger) {
    if (! logger) logger = msg => undefined;
    const key = ensureHexPrefix(this.config.holder.key);
    const signedTxBundle = await this.getWeb3().eth.accounts.signTransaction(tx, key);
    try {
      return await sendTx(this.getWeb3(), signedTxBundle.rawTransaction, this.config.confirmationThreshold, logger);
    }
    catch (error) {
      // TODO Re-think error handling.
      return error;
    }
  }

  async faucetEth(recipient, amount, logger) {
    const txSendEther = await prepareTxSendEther(
      this.getWeb3(),
      this.config.holder.address,
      recipient,
      toBN(amount),
      this.config.gasPrice,
      await this.getCurrentNonce()
    );
    return await this.signAndSend(txSendEther, logger);
  }

  async faucetErc20(recipient, amount, logger) {
    const txTransferErc20 = await prepareTxTransferErc20(
      this.getWeb3(),
      this.config.erc20.contract,
      this.config.holder.address,
      recipient,
      toBN(amount),
      this.config.gasPrice,
      this.config.erc20.gasLimit,
      await this.getCurrentNonce()
    );
    return await this.signAndSend(txTransferErc20, logger);
  }

  async run(recipient, ethAmount, erc20Amount, logger) {
    if (! logger) logger = msg => undefined;

    await this.syncCurrentNonceFromBlockChain();

    const faucets = [];

    if (toBN(ethAmount).gt(toBN(0))) {
      faucets.push(this.faucetEth(recipient, ethAmount, msg => logger(`ETH faucet: ${msg}`)));
      this.incrementCurrentNonce(); // Increment "by hand" since we are about to send multiple transactions into the same pending block.
    }

    if (toBN(erc20Amount).gt(toBN(0))) {
      faucets.push(this.faucetErc20(recipient, erc20Amount, msg => logger(`ERC20 faucet: ${msg}`)));
      this.incrementCurrentNonce(); // Increment "by hand" since we are about to send multiple transactions into the same pending block.
    }

    return await Promise.all(faucets);
  }

  // Without disconnecting, the web socket connection will keep the Node.js process running beyond test completion.
  disconnect() {
    web3Pool.disconnectAll();
  }
}


module.exports = { EthereumAndErc20Faucet };
