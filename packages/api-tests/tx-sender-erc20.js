const { TxSender } = require('./tx-sender.js');


class TxSenderErc20 extends TxSender {
  beSpecific() {
    this.title = `ERC20`;
    this.mainTxAssetId = this.faucetCfg.erc20.assetId;
    this.mainTxAmount = BigInt(this.faucetCfg.erc20.amount);
    this.gasLimitByteCode = BigInt(this.faucetCfg.erc20.gasLimit);
    this.faucetMethod = 'faucetErc20';
  }
}

module.exports = { TxSenderErc20 };
