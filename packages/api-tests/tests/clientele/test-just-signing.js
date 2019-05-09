const crypto = require('crypto');

const { keccak256 } = require('web3-utils');
const EC = require('elliptic').ec;

const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect, removeHexPrefix } = testenv;

const CURVE = 'secp256k1';

// Create and initialize EC context (better do it once and reuse it)
const ec = new EC(CURVE);


test('Testing just signing', async function testJustSigning(t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  const clientele = testenv.getClienteleAPI(username, password);

  const assetIds = [
    testenv.config.assetIds.Ether,
  ];
  const createdWallets = await partials.tCreateWallets(t, clientele, assetIds, username, password);

  t.comment('Generate signatures for those wallets which are Ethereum or Erc20 wallets.')
  for await (const wallet of clientele.wallets.list()) {
    let sig;
    let currentEthBalanceAmount;
    let currentErc20BalanceAmount;

    // Only test Tx creation for ETH and ERC20.
    const protocolNamesToTestWith = [
      'ethereum', 'erc20',
      'ethereum_ropsten', 'erc20_ropsten',
      'ethereum_kovan', 'erc20_kovan',
    ];
    if (-1 === protocolNamesToTestWith.indexOf(wallet.protocol)) {
      continue;
    }

    t.comment('Inspecting listed wallet:');
    inspect(wallet);

    const toSign = crypto.randomBytes(32).toString('hex');
    t.comment('Inspecting the payload/hash to be signed:');
    inspect(toSign);

    t.comment('Create signature.');
    try {
      sig = await clientele.signatures.sign(
        wallet.id,
        password,
        toSign,
        'hex',
        'hex'
      );
    }
    catch (error) {
      return partials.tErrorFail(t, error, 'Creating the signature failed.');
    }
    t.comment('Inspecting signature:');
    inspect(sig);

    t.equal(sig['big_number_format'], 'hex', 'Signature output format is hexadecimal.');
    t.equal(sig['algorithm'], 'ECDSA', 'Signature algorithm is ECDSA');
    t.equal(sig['curve'], CURVE, `Signature uses the "${CURVE}" curve.`);

    // Pseudocode for checking an Ethereum wallet address against public key:
    // `lowercase(address) == lowercase(takeLastTwentyBytes(keccak256(concat(pubkey.x, pubkey.y))))`

    const pubKeyXPadded = removeHexPrefix(sig['public_key']['x']).padStart(64, '0');
    const pubKeyYPadded = removeHexPrefix(sig['public_key']['y']).padStart(64, '0');
    const pubKeyHex = '0x' + pubKeyXPadded + pubKeyYPadded;
    // t.comment('Inspecting pubKeyHex:');
    // inspect(pubKeyHex);

    const addressHash = keccak256(pubKeyHex);
    // t.comment('Inspecting addressHash:');
    // inspect(addressHash, addressHash.slice(-40));

    t.equal('0x' + addressHash.slice(-40).toLowerCase(), wallet.address.toLowerCase(), 'Last 20 bytes of keccak256 hash of the public key are the Ethereum address.')

    // Import public key
    const publicKey = ec.keyFromPublic(
      {
        x: removeHexPrefix(sig['public_key']['x']),
        y: removeHexPrefix(sig['public_key']['y']),
      },
      'hex'
    );

    // Verify signature
    t.ok(publicKey.verify(toSign, {
      r: removeHexPrefix(sig['r']),
      s: removeHexPrefix(sig['s']),
    }), 'Signature can be verified');
  }
  t.end();
});
