const { Signer } = require('./signer.js');
const { isObject } = require('./util.js');
const buildURL = require('axios/lib/helpers/buildURL.js');


class APIKeyAxiosInterceptor {
  constructor(key, secret, passphrase) {
    this.key = key;
    this.passphrase = passphrase;
    this.signer = new Signer(secret);
    this.debugger = null;
  }

  injectDebugger(apiKeyDebugger) {
    this.debugger = apiKeyDebugger;
  }

  // Normalize config.baseURL into config.url
  normalizeUrlConfig(config) {
    if (('baseURL' in config) && ('url' in config)) {
      let baseURL = config.baseURL;
      let url = config.url;

      const endsWithSlash = new RegExp('/$');
      baseURL = baseURL.replace(endsWithSlash, '');

      const startsWithSlash = new RegExp('^/');
      url = url.replace(startsWithSlash, '');

      config.url = `${baseURL}/${url}`;
      delete config.baseURL;
    }

    return config;
  }

  // Normalize config.data into String
  normalizeBodyConfig(config) {
    if (isObject(config.data) || Array.isArray(config.data)) {
      config.data = JSON.stringify(config.data);
      config.headers = config.headers || {};
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  }

  getSignedPathFromAxiosConfig(config) {
    // Arrive at the same parameter serialization as Axios.
    const axiosUrl = buildURL(config.url, config.params, config.paramsSerializer);

    // @see https://developer.mozilla.org/en-US/docs/Web/API/URL
    // @see https://url.spec.whatwg.org/#api
    const whatwgUrl = new URL(axiosUrl);
    return whatwgUrl.pathname + whatwgUrl.search;
  }

  addAPIKeyHeadersAndSignatureToConfig(config) {
    const timestamp = "" + Math.floor(Date.now() / 1000);
    const signedPath = this.getSignedPathFromAxiosConfig(config);
    const messageParts = {
      timestamp,
      method: config.method,
      signedPath,
      body: config.data,
    };
    const signature = this.signer.sign(messageParts);

    config.headers = config.headers || {};
    config.headers['X-UP-API-Key'] = this.key;
    config.headers['X-UP-API-Passphrase'] = this.passphrase;
    config.headers['X-UP-API-Timestamp'] = timestamp;
    config.headers['X-UP-API-Signed-Path'] = signedPath;
    config.headers['X-UP-API-Signature'] = signature;

    return config;
  }

  addDebugInfoToConfig(config) {
    if (this.debugger && 'addDebugInfoToConfig' in this.debugger) {
      config = this.debugger.addDebugInfoToConfig(config);
    }
    return config;
  }

  interceptRequest(config) {
    config = this.normalizeUrlConfig(config);
    config = this.normalizeBodyConfig(config);
    config = this.addAPIKeyHeadersAndSignatureToConfig(config);
    config = this.addDebugInfoToConfig(config);
    return config;
  }

  getRequestInterceptor() {
    return config => this.interceptRequest(config);
  }

  interceptRequestError(error) {
    // TODO Find out under which circumstances there could be an error during request preparation.
    return Promise.reject(error);
  }

  getRequestErrorInterceptor() {
    return error => this.interceptRequestError(error);
  }

  interceptResponse(response) {
    return response;
  }

  getResponseInterceptor() {
    return response => this.interceptResponse(response);
  }

  interceptResponseError(error) {
    if (this.debugger && 'interceptResponseError' in this.debugger) {
      error = this.debugger.interceptResponseError(error);
    }
    return Promise.reject(error);
  }

  getResponseErrorInterceptor() {
    return error => this.interceptResponseError(error);
  }
}

module.exports = {
  APIKeyAxiosInterceptor
};
