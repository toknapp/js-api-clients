const { TxSender } = require('./tx-sender.js');


class TxSenderEth extends TxSender {
  beSpecific() {
    this.title = `ETH`;
    this.mainTxAssetId = this.faucetCfg.eth.assetId;
    this.mainTxAmount = BigInt(this.faucetCfg.eth.amount);
    this.gasLimitByteCode = 0n;
    this.faucetMethod = 'faucetEth';
  }
}

module.exports = { TxSenderEth };
