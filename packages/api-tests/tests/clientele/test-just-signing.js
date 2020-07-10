const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing just signing', async function testJustSigning(t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  inspect({ username, password });

  const clientele = testenv.getClienteleAPI(username, password);

  const assetIds = [
    testenv.config.assetIds.Ether,
  ];
  const createdWallets = await partials.tCreateWallets(t, clientele, assetIds, username, password);

  t.comment('Generate signatures for those wallets which are Ethereum or Erc20 wallets.')
  for await (const wallet of clientele.wallets.list()) {
    let sig;

    // Only test Tx creation for ETH and ERC20.
    const protocolNamesToTestWith = [
      'ethereum', 'erc20',
      'ethereum_ropsten', 'erc20_ropsten',
      'ethereum_kovan', 'erc20_kovan',
    ];
    if (!protocolNamesToTestWith.includes(wallet.protocol)) {
      continue;
    }

    t.comment('Inspecting listed wallet:');
    inspect(wallet);

    await partials.tEthereumSigning(t, clientele, wallet, password);
  }
  t.end();
});
