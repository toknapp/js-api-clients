const EthJsTransaction = require('ethereumjs-tx').Transaction;

const testenv = require('./testenv.js');
const partials = require('./partials.js');
const { TxSender } = require('./tx-sender.js');

// Shortcuts to most-used facilities.
const { inspect, int2BN } = testenv;


class TxSenderRaw extends TxSender {
  beSpecific() {
    this.title = `raw`;
    this.mainTxAssetId = this.faucetCfg.erc20.assetId;
    this.mainTxAmount = BigInt(this.faucetCfg.erc20.amount);
    this.gasLimitByteCode = BigInt(this.faucetCfg.erc20.gasLimit);
    this.faucetMethod = 'faucetErc20';
  }

  async compileTxData() {
    await super.compileTxData();

    this.currentNonce = BigInt(await this.faucet.web3.eth.getTransactionCount(this.wallet.address));

    this.rawTxParams = {
      data: this.faucet.web3.eth.abi.encodeFunctionCall(this.faucet.ERC20_TRANSFER_ABI, [this.faucetCfg.holder.address, int2BN(this.mainTxAmount)]),
      value: '0x0',
      to: this.faucetCfg.erc20.contract,
      nonce: int2BN(this.currentNonce),
      gasPrice: int2BN(this.gasPrice),
      gasLimit: int2BN(this.gasLimit),
    };
  }

  sendTx() {
    this.rawTxParams = Object.assign(this.rawTxParams, {nonce:int2BN(this.currentNonce)});
    this.currentNonce += 1n;

    const ethTx = new EthJsTransaction(this.rawTxParams, {chain: this.faucetCfg.netName});
    const rawTx = ethTx.serialize().toString('hex');
    const base64Tx = ethTx.serialize().toString('base64');
    inspect(`base64Tx == ${base64Tx}`);
    inspect(this.rawTxParams, rawTx);

    return this.api.transactions.createRaw(
      this.wallet.id,
      this.password,
      rawTx,
      'hex',
      this.fund,
    );
  }
}

module.exports = { TxSenderRaw };
