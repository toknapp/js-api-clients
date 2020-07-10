const crypto = require('crypto');

const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

const erc20ABI = require('../../erc20-abi.json');
const minimalTransferABI = erc20ABI.filter(abi => (abi.type == 'function') && (abi.name == 'transfer'))[0];

// Shortcuts to most-used facilities.
const { test, inspect, int2BN } = testenv;


let faucet = null;
let faucetConfig;

async function testComplexTransactionCreationWithFaucet(t) {
  if (! faucet) {
    t.fail('Called testComplexTransactionCreationWithFaucet() without actual faucet configuration being available.')
    t.end();
    return;
  }

  // Encapsulate in try / finally to be able to disconnect the websocket
  // connection of the faucet. Without disconnecting, the Nodejs process would
  // stay alive beyond test completion.
  try {
    // Allow 0 to turn off waiting for balance updates.
    const BALANCE_UPDATE_WAIT_MINUTES = (typeof faucetConfig.balanceUpdateWaitMinutes == 'number') ? faucetConfig.balanceUpdateWaitMinutes : 4;

    const PARALLEL = testenv.parallel;

    const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
    if (! username) return;
    inspect('User credentials, in case the faucetting and/or test Tx fails:', {username, password});

    const clientele = testenv.getClienteleAPI(username, password);

    const assetIds = [
      faucetConfig.eth.assetId,
      faucetConfig.erc20.assetId,
    ];
    const createdWallets = await partials.tCreateWallets(t, clientele, assetIds, username, password);

    t.comment('Generate transactions for those wallets which are Ethereum or Erc20 wallets.')
    for await (const wallet of clientele.wallets.list()) {
      let currentEthBalanceAmount;
      let currentErc20BalanceAmount;
      let faucetResults;

      // Only test Tx creation for ETH and ERC20.
      const protocolNamesToTestTxWith = [
        'ethereum', 'erc20',
        'ethereum_ropsten', 'erc20_ropsten',
        'ethereum_kovan', 'erc20_kovan',
      ];
      if (!protocolNamesToTestTxWith.includes(wallet.protocol)) {
        continue;
      }

      t.comment('Inspecting listed wallet:');
      t.comment(testenv.getAddressEtherscanUrl(wallet.protocol, wallet.address));
      inspect(wallet);

      const tx = {
        type: 'ethereum_function_call',
        to: faucetConfig.erc20.contract,
        value: int2BN(0).toString(10),
        gas_limit: int2BN(faucetConfig.erc20.gasLimit).toString(10),
        gas_price: int2BN(faucetConfig.gasPrice).toString(10),
        abi: minimalTransferABI,
        parameters: [faucetConfig.holder.address, int2BN(faucetConfig.erc20.amount).toString(10)],
      }

      inspect(tx);

      const fund = true;

      let ethBalance = testenv.getBalanceForAssetId(wallet, faucetConfig.eth.assetId);
      if (ethBalance) {
        currentEthBalanceAmount = ethBalance.amount;
      }
      let erc20balance = testenv.getBalanceForAssetId(wallet, faucetConfig.erc20.assetId);
      if (erc20balance) {
        currentErc20BalanceAmount = erc20balance.amount;
      }

      t.ok(int2BN(currentEthBalanceAmount).eq(int2BN(0)), 'Initial ETH Balance is 0');
      t.ok(int2BN(currentErc20BalanceAmount).eq(int2BN(0)), 'Initial ERC20 Balance is 0');

      t.comment(`Creating ${PARALLEL} transactions in the complex workflow in parallel.`);

      t.comment('Faucet *only* ERC20 tokens to the new wallet. This is done to trigger an auxilliary service, which will cover the gas cost.');
      faucetResults = await faucet.run(wallet.address, int2BN(0), int2BN(faucetConfig.erc20.amount).mul(int2BN(PARALLEL)), t.comment);
      for (const faucetResult of faucetResults) {
        t.comment(testenv.getTxEtherscanUrl(wallet.protocol, faucetResult.transactionHash));
      }
      inspect('Faucet results:', faucetResults);

      if (BALANCE_UPDATE_WAIT_MINUTES) {
        currentErc20BalanceAmount = await partials.tWaitForBalanceUpdate(t, clientele, wallet.id, faucetConfig.erc20.assetId, currentErc20BalanceAmount, BALANCE_UPDATE_WAIT_MINUTES);
        t.ok(int2BN(currentErc20BalanceAmount).eq(int2BN(faucetConfig.erc20.amount).mul(int2BN(PARALLEL))), `ERC20 Balance now equals faucet amount times ${PARALLEL}, for ${PARALLEL} parallel transactions.`);
      }

      t.comment(`Set up webhook listener, might take a while.`);
      const webhookRecording = await testenv.getWebhookRecording();

      t.comment(`Create ${PARALLEL} parallel ERC20-only transactions, with external gas funding.`);

      const complexCreate = async () => {
        return await clientele.transactions.createComplex(
          wallet.id,
          password,
          tx,
          fund,
        );
      }

      const complexPromises = [];
      for (let i = 0; i < PARALLEL; i++) {
        complexPromises.push(complexCreate());
      }

      inspect(complexPromises);

      let results = [];
      try {
        results = await Promise.all(complexPromises);
      }
      catch (firstErr) {
        return partials.tErrorFail(t, firstErr, `Creating (at least) one of the ${PARALLEL} parallel ERC20-only transactions failed.`);
      }

      t.comment(`Inspecting results of ${PARALLEL} parallel ERC20-only transaction creations:`);
      for (const txResult of results) {
        inspect(txResult);

        webhookRecording.addMatcher((body, simpleHeaders, rawHeaders, metaData) => {
          const webhookPayload = JSON.parse(body);

          if (webhookPayload.data.id != txResult.id) {
            // This is not the webhook this matcher is looking for.
            return false;
          }

          t.equal(webhookPayload.action, 'transaction.processed', 'Webhook action is "transaction.processed"');

          const signatureHeader = simpleHeaders['X-Up-Signature'];
          t.ok(signatureHeader, 'Found webhook HMAC signature header');
          const hmac = crypto.createHmac('sha256', testenv.config.webhook.hmacKey).update(body, 'utf8').digest('hex');
          t.equal(signatureHeader, 'sha256=' + hmac, 'Webhook HMAC signature matches');

          t.notEqual(webhookPayload.data.hash.length, 0, `Received webhook with transaction hash ${webhookPayload.data.hash}.`);
          t.comment(testenv.getTxEtherscanUrl(wallet.protocol, webhookPayload.data.hash));

          t.notEqual(webhookPayload.data.status, "QUEUED", `Received webhook with transaction status not "QUEUED" anymore.`);

          return true;
        });

      }

      try {
        t.comment(`Waiting for ${PARALLEL * 3} minutes for all expected webhooks to be called.`)
        const areAllExpectedWebhooksCalled = await webhookRecording.areAllMatched(PARALLEL * 3 * 60 * 1000);
        t.ok(areAllExpectedWebhooksCalled, 'All expected webhooks were called');
      }
      catch (err) {
        inspect(err);
        t.fail('Timed out while waiting for all expected webhooks to be called');
      }

      webhookRecording.stop();
    }

  }
  finally {
    if (faucet) {
      faucet.disconnect();
    }
    t.end();
  }
}


if (('faucet' in testenv.config) && ('ethereum' in testenv.config.faucet)) {
  faucetConfig = testenv.config.faucet.ethereum;
  faucet = new testenv.EthereumAndErc20Faucet(faucetConfig);
  test('Testing ERC20 via raw Tx transactions.createComplex() with faucet', testComplexTransactionCreationWithFaucet);
}
else {
  test('Skip testing ERC20 transactions.createComplex() *without* faucet', async t => t.end());
}
