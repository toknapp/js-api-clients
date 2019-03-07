const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test.skip('Debug testing of transactions.create() with specific credentials', async function (t) {
  const username = 'abcdef0123';
  const password = '0123abcdef';
  const seedhash = '0123abcdef0123abcdef01';

  const walletId = '0123abcd-cdef-cdef-cdef-012345abcdef';
  const walletAddress = '0x0123456789abcdef0123456789abcdef01234567';

  const faucetConfig = testenv.config.faucet.ethereum;

  const clientele = testenv.getClienteleAPI(username, password);

  let wallet;
  try {
    wallet = await clientele.wallets.retrieve(walletId);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Retrieving the wallet failed.');
  }

  t.comment('Inspecting retrieved wallet:');
  inspect(wallet);

  let tx;
  try {
    tx = await await clientele.transactions.create(
      wallet.id,
      password,
      recipient=faucetConfig.holder.address,
      symbol=faucetConfig.erc20.symbol,
      quantity=faucetConfig.erc20.amount,
      fee=(faucetConfig.gasPrice * faucetConfig.erc20.gasLimit)
    );
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Creating the transaction failed.');
  }

  t.comment('Inspecting result of transaction creation:');
  inspect(tx);

  t.end();
});
