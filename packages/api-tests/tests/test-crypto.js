const test = require('tape');
const _sodium = require('libsodium-wrappers');
const nodeCrypto = require('crypto');

test('Test that libsodium.crypto_hash() is indeed still SHA512, even after any updates.', async t => {
  await _sodium.ready;
  const sodium = _sodium;

  const testMessage = 'teüøst';

  // Equivalent to SHA512
  const sodiumHexHash = sodium.crypto_hash(sodium.from_string(testMessage, 'utf8'), 'hex');

  const nodeHasher = nodeCrypto.createHash('sha512');
  nodeHasher.update(testMessage, 'utf8');
  const nodeHexHash = nodeHasher.digest('hex');

  t.equal(sodiumHexHash, nodeHexHash, `libsodium's crypto_hash() has the same result as Node.js' crypto.createHash('sha512').`);

  t.end();
});
