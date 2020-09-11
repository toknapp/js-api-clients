const crypto = require('crypto');

const testenv = require('./testenv.js');
const partials = require('./partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


// ABSTRACT !!!
class TxSender {
  constructor(config, harness, {parallel = 1, feeCfg = {gasLimit: null, gasPrice: null, fee: null}} = {}) {
    this.config = config;
    this.faucetCfg = this.config.faucet.ethereum;
    this.harness = harness;
    this.parallel = BigInt(parallel);
    this.feeCfg = feeCfg;
    this.mainTxHashes = new Map();
    this.beSpecific();
    this.readyPromise = new Promise((resolvePromise, rejectPromise) => {
      testenv.getEthereumFaucet().then(f => {
        this.faucet = f;
        resolvePromise();
      });
    });
  }

  // //////////////////
  // // ABSTRACT !!! //
  // //////////////////
  // beSpecific() {
  //   this.title = `ERC20`;
  //   this.mainTxAssetId = this.faucetCfg.erc20.assetId;
  //   this.mainTxAmount = BigInt(this.faucetCfg.erc20.amount);
  //   this.gasLimitByteCode = BigInt(this.faucetCfg.erc20.gasLimit);
  //   this.faucetMethod = 'faucetErc20';
  // }

  get ready() {
    return this.readyPromise;
  }

  async createDynamicWebhooks() {
    this.harness.comment('Create dynamic webhook.');
    await partials.tVerifyDynamicWebhookBaseUrl(this.harness, testenv.tenancy, testenv.config.webhook.dynamicBaseUrl);

    const eventFilters = [`${this.faucetCfg.netName}.transfer.observed`];
    ({ webhook:this.transferObservedWebhook, matcherWrapper:this.transferObservedWebhookMatcherWrapper } = await partials.tCreateDynamicWebhookWithMatcher(this.harness, testenv.tenancy, eventFilters));
  }

  async createUser() {
    ({ username: this.username, password: this.password } = await partials.tCreateUser(this.harness, testenv.tenancy));
    if (! this.username) return;
    inspect('User credentials, in case the faucetting and/or test Tx fails:', {username:this.username, password:this.password});
  }

  async setUpAPICreds() {
    this.api = testenv.getClienteleAPI(this.username, this.password);
  }

  async createWallet() {
    const assetIds = [
      this.faucetCfg.eth.assetId,
      this.faucetCfg.erc20.assetId,
    ];
    const createdWallets = await partials.tCreateWallets(this.harness, this.api, assetIds, this.username, this.password);
    this.wallet = createdWallets.filter(w => w.balances.length == assetIds.length)[0];

    this.harness.comment('Inspecting listed wallet:');
    this.harness.comment(testenv.getAddressEtherscanUrl(this.wallet.protocol, this.wallet.address));
    inspect(this.wallet);

    this.expectedBalances = Object.fromEntries(assetIds.map(a => [a, 0n]));
  }

  getWalletBalancesById() {
    return Object.fromEntries(this.wallet.balances.map(b => [b.asset_id, BigInt(b.amount)]));
  }

  async refreshWallet() {
    this.wallet = await this.api.wallets.retrieve(this.wallet.id);
  }

  async checkBalances() {
    await this.refreshWallet();
    const walletBalancesById = this.getWalletBalancesById();
    for (const [assetId, expectedBalance] of Object.entries(this.expectedBalances)) {
      this.harness.equal(walletBalancesById[assetId], expectedBalance, `Balance for Asset ${assetId} as expected: ${expectedBalance}`);
    }
  }

  async setUpWebhookRecordings() {
    this.faucetTxTransferWebhookRecording = await testenv.getWebhookRecording();
    this.fundingTxTransferWebhookRecording = await testenv.getWebhookRecording();
    this.mainTxProcessedWebhookRecording = await testenv.getWebhookRecording();
    this.mainTxTransferWebhookRecording = await testenv.getWebhookRecording();
  }

  async compileTxData() {
    this.gasLimit = this.faucet.GAS_LIMIT_TRANSACTION + this.gasLimitByteCode;
    this.gasPrice = BigInt(await this.faucet.getGasPrice());
    this.fee = this.gasPrice * this.gasLimit;
    this.fund = true;
    await this.setEffectiveFeeCfg();
  }

  async setEffectiveFeeCfg() {
    const applyFeeCfg = (cfg, defaultValue, acceptedValues=[]) =>{
      acceptedValues = new Set(acceptedValues);
      if (cfg === undefined || cfg === null) {
        return undefined;
      }
      if (acceptedValues.has(cfg)) {
        return cfg;
      }
      try {
        return BigInt(cfg).toString(10);
      }
      catch (err) {
        // Pass. Only returns if conversion is successful, otherwise fall back to default value.
      }
      return BigInt(defaultValue).toString(10);
    };

    this.effectiveFeeCfg  = {
      gasLimit: applyFeeCfg(this.feeCfg.gasLimit, this.gasLimit),
      gasPrice: applyFeeCfg(this.feeCfg.gasPrice, this.gasPrice, this.faucet.GAS_PRICE_LEVELS),
      fee: applyFeeCfg(this.feeCfg.fee, this.fee),
    };

    this.harness.comment(`Inspecting effective fee configuration.`);
    inspect(this.effectiveFeeCfg);
  }

  async runFaucet() {
    this.harness.comment(`Faucet some ${this.title} to the new wallet.`);
    let faucetResult;
    try {
      this.faucetResult = await this.faucet[this.faucetMethod](this.wallet.address, this.mainTxAmount * this.parallel, this.harness.comment);
    }
    catch (err) {
      partials.tErrorFail(this.harness, err, `Faucetting some ${this.title} to the new wallet failed.`);
      throw err;
    }
    this.harness.comment(testenv.getTxEtherscanUrl(this.wallet.protocol, this.faucetResult.transactionHash));
    inspect('Faucet result:', this.faucetResult);
    this.expectedBalances[this.mainTxAssetId] += this.mainTxAmount * this.parallel;
  }

  async setUpWebhookMatcherForFaucetTxTransfer() {
    this.faucetTxTransferWebhookRecording.addMatcher(this.transferObservedWebhookMatcherWrapper((t, webhookPayload) => {
      if (webhookPayload.data.txhash != this.faucetResult.transactionHash) {
        return false;
      }

      t.comment('inspect webhookPayload');
      inspect(webhookPayload);

      t.equal(webhookPayload.action, 'transfer.observed', `Webhook payload has expected action value.`);
      t.equal(webhookPayload.data.asset.id, this.mainTxAssetId, `Transferred Asset ID in Webhook payload has expected value.`);
      t.equal(BigInt(webhookPayload.data.quantity), this.mainTxAmount * this.parallel, `Transferred quantity in Webhook payload has expected value.`);
      t.equal(webhookPayload.data.sender, this.faucetCfg.holder.address, `Sender address in Webhook payload has expected value.`);
      t.equal(webhookPayload.data.recipient, this.wallet.address, `Recipient address in Webhook payload has expected value.`);

      // {
      //   "quantity": int(self.transaction.quantity),
      //   "txhash": self.transaction.txhash,
      //   "transaction_id": str(self.transaction.uuid),
      //   "sender": self.transaction.sender,
      //   "recipient": self.transaction.recipient,
      //   "asset": {
      //     "id": str(self.transaction.asset.uuid),
      //     "name": self.transaction.asset.name,
      //     "symbol": self.transaction.asset.symbol,
      //     "exponent": self.transaction.asset.exponent,
      //   },
      // }

      return true;
    }));
  }

  async waitForFaucetTxTransferWebhook() {
    return await this.waitForWebhooksToBeMatched('faucetTxTransferWebhookRecording');
  }

  sendTx() {
    return this.api.transactions.create(
      this.wallet.id,
      this.password,
      this.faucetCfg.holder.address,
      this.mainTxAssetId,
      this.mainTxAmount.toString(10),
      this.effectiveFeeCfg.fee,
      true,
      null,
      this.fund,
      this.effectiveFeeCfg.gasLimit,
      this.effectiveFeeCfg.gasPrice,
    );
  }

  async sendAllTxs() {
    this.harness.comment(`Create ${this.parallel} ${this.title} transaction(s).`);
    const txPromises = [];
    for (let i = 0; i < this.parallel; i++) {
      txPromises.push(this.sendTx());
    }
    const txResults = await Promise.allSettled(txPromises);
    this.txSuccesses = txResults.filter(res => res.status == 'fulfilled').map(res => res.value);
    const txErrors = txResults.filter(res => res.status == 'rejected').map(res => res.reason);

    for (const txError of txErrors) {
      testenv.inspectError(txError);
      this.harness.fail(`Creating ${this.title} transaction failed.`);
    }

    this.harness.comment(`Inspecting successful results of ${this.title} transaction creation:`);
    inspect(this.txSuccesses);
    this.expectedBalances[this.mainTxAssetId] -= this.mainTxAmount * BigInt(this.txSuccesses.length);
  }

  async matchMainTxProcessedWebhook(body, simpleHeaders, txId) {
    const webhookPayload = JSON.parse(body);

    if (webhookPayload.data.id != txId) {
      // This is not the webhook this matcher is looking for.
      return false;
    }

    this.harness.equal(webhookPayload.action, 'transaction.processed', 'Webhook action is "transaction.processed"');

    const signatureHeader = simpleHeaders['X-Up-Signature'];
    this.harness.ok(signatureHeader, 'Found webhook HMAC signature header');
    const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
    this.harness.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

    this.harness.notEqual(webhookPayload.data.hash.length, 0, `Received webhook with transaction hash ${webhookPayload.data.hash}.`);
    this.harness.comment(testenv.getTxEtherscanUrl(this.wallet.protocol, webhookPayload.data.hash));
    this.harness.notEqual(webhookPayload.data.status, "QUEUED", `Received webhook with transaction status not "QUEUED" anymore.`);

    this.mainTxHashes.set(txId, webhookPayload.data.hash);

    return true;
  }

  async setUpWebhookMatchersForMainTxProcessed() {
    for (const { id:txId } of this.txSuccesses) {
      this.mainTxProcessedWebhookRecording.addMatcher((body, simpleHeaders, rawHeaders, metaData) => this.matchMainTxProcessedWebhook(body, simpleHeaders, txId));
    }
  }

  async setUpWebhookMatchersForMainTxTransfer() {
    for (const { id:txId } of this.txSuccesses) {
      this.mainTxTransferWebhookRecording.addMatcher(this.transferObservedWebhookMatcherWrapper((t, webhookPayload) => {
        if (webhookPayload.data.txhash != this.mainTxHashes.get(txId)) {
          return false;
        }

        t.comment('inspect webhookPayload');
        inspect(webhookPayload);

        t.equal(webhookPayload.action, 'transfer.observed', `Webhook payload has expected action value.`);
        t.equal(webhookPayload.data.asset.id, this.mainTxAssetId, `Transferred Asset ID in Webhook payload has expected value.`);
        t.equal(BigInt(webhookPayload.data.quantity), this.mainTxAmount, `Transferred quantity in Webhook payload has expected value.`);
        t.equal(webhookPayload.data.sender, this.wallet.address, `Sender address in Webhook payload has expected value.`);
        t.equal(webhookPayload.data.recipient, this.faucetCfg.holder.address, `Recipient address in Webhook payload has expected value.`);

        return true;
      }));
    }
  }

  async waitForMainTxProcessedWebhooksToBeMatched() {
    return await this.waitForWebhooksToBeMatched('mainTxProcessedWebhookRecording');
  }

  async waitForMainTxTransferWebhooksToBeMatched() {
    return await this.waitForWebhooksToBeMatched('mainTxTransferWebhookRecording');
  }

  async waitForWebhooksToBeMatched(whichRecording) {
    try {
      this.harness.comment(`Waiting for expected webhooks on ${whichRecording} to be called.`)
      const areAllExpectedWebhooksCalled = await this[whichRecording].areAllMatched(this.config.webhook.timeOut * Number(this.parallel));
      this.harness.ok(areAllExpectedWebhooksCalled, `expected webhooks on ${whichRecording} were called`);
    }
    catch (err) {
      inspect(err);
      this.harness.fail(`Timed out while waiting for expected webhooks on ${whichRecording} to be called`);
    }
  }

  async stopWebhookRecordings() {
    this.faucetTxTransferWebhookRecording.stop();
    this.fundingTxTransferWebhookRecording.stop();
    this.mainTxProcessedWebhookRecording.stop();
    this.mainTxTransferWebhookRecording.stop();
  }

  async retrieveSucessfulTxs() {
    for (const { id:txId } of this.txSuccesses) {
      const tx = await this.api.transactions.retrieve(this.wallet.id, txId);
      this.harness.comment(`Inspecting retrieved TX:`);
      inspect(tx);

      // {
      //   quantity: '1',
      //   recipient: '0x981dB36C73aed93D4505Bd1F6D11CE99640c8095',
      //   fee: '148249500000000',
      //   sender: '0x39e7565B204540f0bD9C474c4e32289b47f9C879',
      //   id: 'f59dd3cf-3355-4964-ba07-c8e34dcac21e',
      //   status: 'CONFIRMING',
      //   txhash: '0xfd4d6aa4122e3fb34f63e1e9f5a6d422c4f48a9cf409d6d2a11ff756b98d7870',
      //   fee_info: {
      //     fee: '33103500000000',
      //     gas_used: '22069',
      //     gas_limit: '98833',
      //     gas_price: '1500000000'
      //   },
      //   wallet_id: '455d2e32-5eeb-4a35-8bd6-51299d81187d',
      //   asset_id: 'cf08564b-8fa3-5c88-a29b-029915471249',
      //   asset_name: 'Upvest Testing ERC20 Faucet (Ropsten)',
      //   exponent: 18
      // }

      if (testenv.isStringOfDigits(this.effectiveFeeCfg.fee)) {
        this.harness.equal(tx.fee, this.effectiveFeeCfg.fee, `TX fee as requested: ${this.effectiveFeeCfg.fee}`);
      }
      if (testenv.isStringOfDigits(this.effectiveFeeCfg.gasLimit)) {
        this.harness.equal(tx.fee_info.gas_limit, this.effectiveFeeCfg.gasLimit, `TX gas limit as requested: ${this.effectiveFeeCfg.gasLimit}`);
      }
      if (testenv.isStringOfDigits(this.effectiveFeeCfg.gasPrice)) {
        this.harness.equal(tx.fee_info.gas_price, this.effectiveFeeCfg.gasPrice, `TX gas price as requested: ${this.effectiveFeeCfg.gasPrice}`);
      }

      this.expectedBalances[this.faucetCfg.eth.assetId] += BigInt(tx.fee_info.gas_limit) * BigInt(tx.fee_info.gas_price);
      this.expectedBalances[this.faucetCfg.eth.assetId] -= BigInt(tx.fee_info.gas_used) * BigInt(tx.fee_info.gas_price);
    }
  }

  async deleteDynamicWebhooks() {
    let result;
    try {
      result = await testenv.tenancy.webhooks.delete(this.transferObservedWebhook.id);
    }
    catch (error) {
      tErrorFail(this.harness, error, 'Deleting the webhook failed.');
    }
    this.harness.ok(result, `Deleting the webhook succeeded.`);
  }

  async run() {
    try {
      await this.createDynamicWebhooks();
      await this.createUser();
      await this.setUpAPICreds();
      await this.createWallet();
      await this.checkBalances();
      await this.setUpWebhookRecordings();
      await this.compileTxData();
      await this.runFaucet();
      await this.setUpWebhookMatcherForFaucetTxTransfer();
      await this.waitForFaucetTxTransferWebhook();
      await this.checkBalances();
      await this.sendAllTxs();
      await this.setUpWebhookMatchersForMainTxProcessed();
      await this.setUpWebhookMatchersForMainTxTransfer();
      await this.waitForMainTxProcessedWebhooksToBeMatched();
      await this.waitForMainTxTransferWebhooksToBeMatched();
      await this.stopWebhookRecordings();
      await this.retrieveSucessfulTxs();
      await this.checkBalances();
    }
    finally {
      await this.deleteDynamicWebhooks();
      this.harness.end();
    }
  }
}

module.exports = { TxSender };
