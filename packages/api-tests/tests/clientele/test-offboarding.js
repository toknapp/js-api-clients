const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;

const JSZip = require("jszip");

const { setEqual } = require('../../util.js');


test('Testing wallets.create(), and offboarding', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  const clientele = testenv.getClienteleAPI(username, password);

  const assetIds = [
    testenv.config.assetIds.Ether,
  ];
  const createdWallets = await partials.tCreateWallets(t, clientele, assetIds, username, password);

  const walletsById = new Map();
  const walletIds = new Set();
  for await (const wallet of clientele.wallets.list()) {
    walletsById.set(wallet.id, wallet);
    walletIds.add(wallet.id);
  }

  t.comment('Calling offboarding endpoint and parsing returned data');
  const zipFileRaw = await clientele.offboard(password);

  t.comment('Parsing Zip file and verifying contents');
  let zipFile;
  try {
    zipFile = await JSZip.loadAsync(zipFileRaw);
  }
  catch (err) {
    console.log(testenv.hexdump(Buffer.from(zipFileRaw)));
    inspect(err);
    t.fail('Error while parsing Zip file');
    t.end();
    return;
  }

  const walletIdsInZipFile = new Set();
  for (const [fileName, file] of Object.entries(zipFile.files)) {
    t.comment(`Parsing body of ${fileName}`);
    const walletData = JSON.parse(await file.async('string'));
    t.ok('crypto' in walletData, 'Wallet file has "crypto" field.');
    t.ok('id' in walletData, 'Wallet file has "id" field.');
    t.ok('version' in walletData, 'Wallet file has "version" field.');
    walletIdsInZipFile.add(walletData.id);
  }

  t.ok(setEqual(walletIds, walletIdsInZipFile), 'Wallet IDs in zip file are the same as seen on wallets.list() endpoint.');

  t.end();
});
