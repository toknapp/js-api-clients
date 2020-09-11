const EthereumTx = require('ethereumjs-tx').Transaction;

const erc20ABI = require('./erc20-abi.json');

const web3Pool = require('./web3-pool.js');

const {
  inspect, getTxEtherscanUrl, hexBigInt, ensureHexPrefix, removeHexPrefix
} = require('./util.js');

const { EthGasStation } = require('./ethgasstation.js');


class EthereumAndErc20Faucet {
  GAS_LIMIT_TRANSACTION = 21000n;
  ERC20_TRANSFER_ABI = erc20ABI.filter(abi => (abi.type == 'function') && (abi.name == 'transfer'))[0];
  GAS_PRICE_LEVELS = new Set(['fastest', 'fast', 'medium', 'slow']);

  constructor(config) {
    this.config = config;
  }

  // Interface for (potential) async initialization
  get ready() {
    return Promise.resolve();
  }

  get web3() {
    return web3Pool.getWeb3(this.config.infuraProjectId, this.config.netName);
  }

  async getGasPrice() {
    if ('mainnet' == this.config.netName) {
      if (! this.egs) {
        this.egs = new EthGasStation({apiKey:this.config.ethGasStationApiKey});
      }
      return BigInt((await this.egs.getGasPrice(24)).min);
    }
    else {
      return BigInt(await this.web3.eth.getGasPrice());
    }
  }

  async getCurrentNonce(address=null) {
    address = this.web3.utils.toChecksumAddress(address || this.config.holder.address);
    return BigInt(await this.web3.eth.getTransactionCount(address, 'pending'));
  }

  async sign(txParams) {
    const privateKey = Buffer.from(removeHexPrefix(this.config.holder.key), 'hex');
    const tx = new EthereumTx(txParams, { chain: this.config.netName, hardfork: 'petersburg' });
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    return ensureHexPrefix(serializedTx.toString('hex'));
  }

  send(rawTransaction, logger) {
    const that = this;
    return new Promise(function promiseExecutor(resolvePromise, rejectPromise) {
      if (! logger) logger = msg => undefined;
      let rejectionReceipt = null;
      let removeTxListeners;

      const txPromise = that.web3.eth.sendSignedTransaction(rawTransaction);

      txPromise.once('transactionHash', transactionHash => logger(getTxEtherscanUrl(`ethereum_${that.config.netName}`, transactionHash)));
      txPromise.once('receipt', receipt => logger(`receipt = ${JSON.stringify(receipt, null, 2)}`));

      const txConfirmationListener = function(confirmationNumber, receipt) {
        logger(`confirmation number: ${confirmationNumber}`);
        if (! receipt.status) {
          rejectionReceipt = receipt;
        }

        if (Number(confirmationNumber) >= that.config.confirmationThreshold) {
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

  async faucetEth(recipient, amount, logger) {
    const txSendEther = {
      data: '0x',
      value: hexBigInt(amount),
      to: ensureHexPrefix(recipient),
      nonce: hexBigInt(await this.getCurrentNonce()),
      gasLimit: hexBigInt(this.GAS_LIMIT_TRANSACTION),
      gasPrice: hexBigInt(await this.getGasPrice()),
    }
    return await this.send(await this.sign(txSendEther), logger);
  }

  async faucetErc20(recipient, amount, logger) {
    const transferCall = this.web3.eth.abi.encodeFunctionCall(this.ERC20_TRANSFER_ABI, [recipient, String(BigInt(amount))]);

    const estimateData = {
      from: ensureHexPrefix(this.config.holder.address),
      data: transferCall,
      value: '0x0',
      to: ensureHexPrefix(this.config.erc20.contract),
    }
    const gasLimitEstimate = await this.web3.eth.estimateGas(estimateData);

    const txTransferErc20 = {
      data: transferCall,
      value: '0x0',
      to: ensureHexPrefix(this.config.erc20.contract),
      nonce: hexBigInt(await this.getCurrentNonce()),
      gasLimit: hexBigInt(gasLimitEstimate),
      gasPrice: hexBigInt(await this.getGasPrice()),
    }
    return await this.send(await this.sign(txTransferErc20), logger);
  }

  // Without disconnecting, the web socket connection will keep the Node.js process running beyond test completion.
  finalize() {
    web3Pool.disconnectAll();
  }
}


module.exports = { EthereumAndErc20Faucet };
