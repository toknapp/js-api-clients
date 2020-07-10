const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;

const JSZip = require("jszip");


test('Testing wallets.create(), and offboarding', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  const clientele = testenv.getClienteleAPI(username, password);

  const assetIds = [
    testenv.config.assetIds.Bitcoin,
    testenv.config.assetIds.Ether,
  ];
  const createdWallets = await partials.tCreateWallets(t, clientele, assetIds, username, password);

  t.comment('Calling offboarding endpoint and parsing returned data');
  const offboardingResponse = await clientele.offboard(password);

  t.equal(offboardingResponse.previous, null, 'Previous page link is null.');
  t.equal(offboardingResponse.next, null, 'Next page link is null.');

  const zipFileRaw = Buffer.from(offboardingResponse.zip_base64, 'base64');

  t.comment('Loading Zip file');
  let zipFile;
  try {
    zipFile = await JSZip.loadAsync(zipFileRaw);
  }
  catch (err) {
    console.log(testenv.hexdump(zipFileRaw));
    inspect(err);
    t.fail('Error while parsing Zip file');
    t.end();
    return;
  }

  const filesFromZip = new Map();
  for (const [fileName, file] of Object.entries(zipFile.files)) {
    t.comment(`Extracting ${fileName}`);
    filesFromZip.set(fileName, await file.async('nodebuffer'));
  }

  const jsonMetadata = offboardingResponse.metadata;
  const zipMetadata = JSON.parse(filesFromZip.get(`metadata.json`).toString('utf8'));
  t.deepEqual(jsonMetadata, zipMetadata, 'JSON and ZIP metadata are equal.');
  t.equal(jsonMetadata.username, username, 'Metadata username and given username are equal.');
  t.equal(jsonMetadata.total_wallet_count, createdWallets.length, 'Metadata total_wallet_count and number of created wallets are equal.');
  t.equal(jsonMetadata.offboarded_wallet_count, createdWallets.length, 'Metadata offboarded_wallet_count and number of created wallets are equal.');

  const jsonResultsById = new Map();
  for (const wdata of offboardingResponse.results) {
    jsonResultsById.set(wdata.id, wdata);
  }

  for (const wallet of createdWallets) {
    const jsonResult = jsonResultsById.get(wallet.id);
    t.equal(wallet.address, jsonResult.address, 'Wallet address in JSON result is OK');
    t.equal(wallet.protocol, jsonResult.protocol, 'Wallet protocol in JSON result is OK');
    const simpleWalletProtocol = wallet.protocol.replace(/_ropsten$/, '').replace(/_testnet$/, '');
    const fnStem = `${simpleWalletProtocol}_${wallet.address}`;
    if (simpleWalletProtocol == 'ethereum') {
      const jsonKeystore = jsonResult.keystore_file;
      const zipKeystore = JSON.parse(filesFromZip.get(`${fnStem}.json`).toString('utf8'));
      t.deepEqual(jsonKeystore, zipKeystore, 'JSON and ZIP keystore are equal.');
      // TODO decrypt keystore file and verify that private key belongs to wallet address
    }
    else if (simpleWalletProtocol == 'bitcoin') {
      const jsonBip38 = jsonResult.bip38_encrypted_private_key;
      const jsonQrSvg = jsonResult.qr_code_svg;
      const jsonQrPng = Buffer.from(jsonResult.qr_code_png_base64, 'base64');
      const zipBip38 = filesFromZip.get(`${fnStem}/${fnStem}.txt`).toString('utf8');
      const zipQrSvg = filesFromZip.get(`${fnStem}/${fnStem}.svg`).toString('utf8');
      const zipQrPng = filesFromZip.get(`${fnStem}/${fnStem}.png`);
      t.deepEqual(jsonBip38, zipBip38, 'JSON and ZIP bip38_encrypted_private_key are equal.');
      t.deepEqual(jsonQrSvg, zipQrSvg, 'JSON and ZIP SVG QR code are equal.');
      t.deepEqual(jsonQrPng, zipQrPng, 'JSON and ZIP PNG QR code are equal.');
      // TODO decrypt BIP38 and verify that private key belongs to wallet address
    }
    else {
      t.fail(`Unknown wallet protocol ${simpleWalletProtocol}`);
    }
  }

  t.end();
});
