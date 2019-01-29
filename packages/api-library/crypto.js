const _sodium = require('libsodium-wrappers');

const getSodium = async () => {
  await _sodium.ready;
  return _sodium;
};

const getHelpers = sodium => {
  return {
    toHex: sodium.to_hex,
    toString: sodium.to_string,
    fromString: sodium.from_string,
    toB64: bytes => sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL),
    fromB64: b64 => sodium.from_base64(b64, sodium.base64_variants.ORIGINAL),
  }
}

const getSaltedPasswordHashSHA512 = async (password, salt, salt_position='suffix', digest_format='hex') => {
  const sodium = await getSodium();
  const { fromString } = getHelpers(sodium);
  const salted = 'suffix' == salt_position ? password + salt : salt + password;
  return sodium.crypto_hash(fromString(salted), digest_format || 'hex');
};

const getBoxKeyPair = async () => {
  const sodium = await getSodium();
  const { toB64 } = getHelpers(sodium);
  const { privateKey, publicKey } = sodium.crypto_box_keypair();
  return {
    privateKey: toB64(privateKey),
    publicKey: toB64(publicKey),
  };
};

const getUserSecretCiphertext = async (password, innerPublicKey) => {
  const sodium = await getSodium();
  const { fromB64, toB64 } = getHelpers(sodium);
  const ciphertext = sodium.crypto_box_seal(password, fromB64(innerPublicKey));
  return toB64(ciphertext);
};

module.exports = {
  getSaltedPasswordHashSHA512,
  getUserSecretCiphertext
};
