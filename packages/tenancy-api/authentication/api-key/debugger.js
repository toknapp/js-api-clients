const { canonicalizeQueryParams } = require('./canonical-query-parameters.js');
const { Signer } = require('./signer.js');
const { isObject } = require('./util.js');


class APIKeyDebugger {
  constructor(interceptor) {
    this.interceptor = interceptor;
    this.interceptor.injectDebugger(this);
  }

  addDebugInfoToConfig(config) {
    const messageParts = {
      timestamp: config.headers['X-UP-API-Timestamp'],
      method: config.method,
      url: config.url,
      queryParams: config.params,
      body: config.data,
    };
    config.signatureDebugInfo = this.interceptor.signer.getDebugInfo(messageParts);
    return config;
  }

  _handleDebugInfo(signatureDebugInfo, serverDebugInfo) {
    const toServerMessagePartName = {
      timestamp: 'timestamp',
      method: 'method',
      url: 'path',
      queryParams: 'query_params',
      body: 'body',
    }
    for (const [messagePartName, debugInfo] of Object.entries(signatureDebugInfo)) {
      const ourSha512 = debugInfo.sha512.toLowerCase();
      const serverSha512 = serverDebugInfo.message_parts[toServerMessagePartName[messagePartName]].sha512.toLowerCase();
      if (ourSha512 != serverSha512) {
        console.log(`The SHA512 does not match for the "${messagePartName}" message part.`);
        console.log(`We sent:`);
        console.dir(debugInfo.normalized.toString('utf8'));
        console.log(`Server got:`);
        console.dir(serverDebugInfo.message_parts[toServerMessagePartName[messagePartName]].canonicalized);
      }
    }
  }

  interceptResponseError(error) {
    // console.dir(error, {depth:null, colors:true});
    if (
      (403 == error.response.status)
      &&
      ('error' in error.response.data)
      &&
      ('details' in error.response.data.error)
      &&
      ('signatureDebugInfo' in error.config)
    ) {
      for (const detail of error.response.data.error.details) {
        if (
          (detail.reason == 'debugHint')
          &&
          (detail.location == 'X-UP-API-Signature')
        ) {
          this._handleDebugInfo(error.config.signatureDebugInfo, detail.value);
        }
      }
    }
    return error;
  }
}

module.exports = {
  APIKeyDebugger
};
