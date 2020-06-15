const crypto = require('crypto');

const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing wallets.create() with indexes, wallets.list() and wallets.retrieve()', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  inspect({ username, password });

  const clientele = testenv.getClienteleAPI(username, password);

  const assetIdsAndIndexes = [
    // testenv.config.assetIds.Arweave,
    testenv.config.assetIds.Bitcoin,
    [testenv.config.assetIds.Bitcoin, 0],
    [testenv.config.assetIds.Bitcoin, 1],

    testenv.config.assetIds.Ether,
    testenv.config.assetIds.ExampleERC20,

    [testenv.config.assetIds.Ether, 0],
    [testenv.config.assetIds.ExampleERC20, 0],

    [testenv.config.assetIds.Ether, 1],
    [testenv.config.assetIds.ExampleERC20, 1],
  ];

  const createdWallets = await partials.tCreateWallets(t, clientele, assetIdsAndIndexes, username, password);

  t.comment('Inspecting created wallets:');
  inspect(createdWallets);

  t.comment('Test listing all wallets of one user, and retrieving each one of them.');
  let walletCount = 0;
  for await (const wallet of clientele.wallets.list()) {
    t.comment('Inspecting listed wallet:');
    inspect(wallet);
    let retrievedWallet;
    try {
      retrievedWallet = await clientele.wallets.retrieve(wallet.id);
    }
    catch (error) {
      return partials.tErrorFail(t, error, 'Retrieving the wallet failed.');
    }
    t.comment('Inspecting retrieved wallet:');
    inspect(retrievedWallet);

    // { id: '3e10efd9-72ce-4247-8bd9-50b9d14e1b27',
    //   address: '0x5eD17929FD017F98479c95A26ba1AA03bcF4628F',
    //   balances:
    //    [ { amount: '0', name: 'Ethereum', symbol: 'ETH', exponent: 18 } ],
    //   protocol: 'erc20_ropsten',
    //   status: 'ACTIVE' }

    t.equal(wallet.id, retrievedWallet.id, 'listed and retrieved wallet.id are equal');
    t.ok(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(wallet.id), 'wallet.id matches UUID pattern');

    wallet.balances.forEach(function callback(balance, index) {
      const retrievedBalance = retrievedWallet.balances[index];
      t.equal(balance.name, retrievedBalance.name, 'listed and retrieved balance.name are equal');
      t.equal(balance.symbol, retrievedBalance.symbol, 'listed and retrieved balance.symbol are equal');
      t.equal(balance.exponent, retrievedBalance.exponent, 'listed and retrieved balance.exponent are equal');
      t.equal(typeof balance.exponent, 'number', 'balance.exponent is a number');
      t.equal(balance.amount, retrievedBalance.amount, 'listed and retrieved balance.amount are equal');
      t.equal(typeof balance.amount, 'string', 'balance.amount is a string (to deal with numbers > 2**53)');
    });

    t.equal(wallet.protocol, retrievedWallet.protocol, 'listed and retrieved wallet.protocol are equal');
    t.notOk(wallet.protocol.startsWith('co.upvest.kinds.'), 'wallet.protocol does not start with "co.upvest.kinds."');

    t.equal(wallet.address, retrievedWallet.address, 'listed and retrieved wallet.address are equal');

    t.equal(wallet.status, retrievedWallet.status, 'listed and retrieved wallet.status are equal');

    const walletStates = new Set(['PENDING', 'ACTIVE']);
    t.ok(walletStates.has(wallet.status), 'wallet.status is one of "PENDING" or "ACTIVE".');
    walletCount++;
  }
  t.equal(walletCount, 6, 'Have expected number of wallets.');

  t.end();
});
