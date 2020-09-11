const testenv = require('./testenv.js');
const partials = require('./partials.js');
const { TxSender } = require('./tx-sender.js');

// Shortcuts to most-used facilities.
const { inspect } = testenv;


class TxSenderComplex extends TxSender {
  beSpecific() {
    this.title = `complex`;
    this.mainTxAssetId = this.faucetCfg.erc20.assetId;
    this.mainTxAmount = BigInt(this.faucetCfg.erc20.amount);
    this.gasLimitByteCode = BigInt(this.faucetCfg.erc20.gasLimit);
    this.faucetMethod = 'faucetErc20';
  }

  async compileTxData() {
    await super.compileTxData();

    this.complexTxData = {
      type: 'ethereum_function_call',
      to: this.faucetCfg.erc20.contract,
      value: 0n.toString(10),
      gas_limit: this.effectiveFeeCfg.gasLimit,
      gas_price: this.effectiveFeeCfg.gasPrice,
      abi: this.faucet.ERC20_TRANSFER_ABI,
      parameters: [this.faucetCfg.holder.address, this.mainTxAmount.toString(10)],
    }
    inspect(this.complexTxData);
  }

  sendTx() {
    return this.api.transactions.createComplex(
      this.wallet.id,
      this.password,
      this.complexTxData,
      this.fund,
    );
  }
}

module.exports = { TxSenderComplex };
