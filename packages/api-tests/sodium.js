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

const getPublicKeySigner = async signingKeyBase64 => {
  const sodium = await getSodium();
  const { fromB64, toB64 } = getHelpers(sodium);
  const signingKey = fromB64(signingKeyBase64);
  return msg => toB64(sodium.crypto_sign_detached(msg, signingKey));
};

const getPublicKeySignatureVerifier = async verifyingKeyBase64 => {
  const sodium = await getSodium();
  const { fromB64 } = getHelpers(sodium);
  const verifyingKey = fromB64(verifyingKeyBase64);
  return (sig, msg) => sodium.crypto_sign_verify_detached(fromB64(sig), msg, verifyingKey);
};

const getPublicKeySignatureKeyPairBase64 = async () => {
  const sodium = await getSodium();
  const { toB64 } = getHelpers(sodium);
  const { privateKey, publicKey, keyType } = sodium.crypto_sign_keypair();
  return {
    privateKey: toB64(privateKey),
    publicKey: toB64(publicKey),
    keyType
  };
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

const decryptSealedBox = async (ciphertext, publicKey, privateKey) => {
  const sodium = await getSodium();
  const { fromB64 } = getHelpers(sodium);
  // see https://github.com/jedisct1/libsodium.js/blob/master/wrapper/symbols/crypto_box_seal_open.json
  return sodium.crypto_box_seal_open(fromB64(ciphertext), fromB64(publicKey), fromB64(privateKey));
};

module.exports = {
  getPublicKeySigner,
  getPublicKeySignatureKeyPairBase64,
  getPublicKeySignatureVerifier,
  getBoxKeyPair,
  decryptSealedBox,
};
