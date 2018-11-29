const crypto = require('crypto');
const { canonicalizeQueryParams } = require('./canonical-query-parameters.js');
const { toBuf } = require('./util.js');


// This is an Array to preserve the order during signing.
const messagePartsConfig = [
  {
    name: 'timestamp',
    normalize: timestamp => toBuf(String(timestamp)),
  },
  {
    name: 'method',
    normalize: method => toBuf(method.toUpperCase()),
  },
  {
    name: 'url',
    normalize: url => toBuf((new URL(url)).pathname),
  },
  {
    name: 'queryParams',
    normalize: queryParams => canonicalizeQueryParams(queryParams),
  },
  {
    name: 'body',
    normalize: body => toBuf(body ? body : ''),
  },
];


class Signer {
  constructor(secret) {
    this.secret = secret;
  }

  sign(messageParts) {
    const hmac = crypto.createHmac('sha512', this.secret);
    for (const {name, normalize} of messagePartsConfig) {
      hmac.update(normalize(messageParts[name]));
    }
    return hmac.digest('hex');
  }

  getDebugInfo(messageParts) {
    const debugInfo = {};
    for (const {name, normalize} of messagePartsConfig) {
      const normalized = normalize(messageParts[name]);
      const sha512 = crypto.createHash('sha512').update(normalized).digest('hex');
      debugInfo[name] = {normalized, sha512};
    }
    return debugInfo;
  }
}

module.exports = {
  Signer
};
