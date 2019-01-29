const util = require('util');
const axios = require('axios');
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');

const { AsyncClientWrapper, AssetsEndpoint, WalletsEndpoint, TransactionsEndpoint } = require('@upvest/api-library');


class UpvestClienteleAPI {
  constructor(baseURL, passwordPacker, client_id, client_secret, username, password, scope=['read', 'write', 'echo', 'wallet', 'transaction'], timeout=120000) {
    const api = this;
    this.passwordPacker = passwordPacker;

    const clientPromise = this.passwordPacker.hash(password).then(saltedPasswordHash => {
      const oauth2TokenURL = baseURL + 'clientele/oauth2/token';

      const getOwnerCredentials = oauth.client(axios.create(), {
        url: oauth2TokenURL,
        grant_type: 'password',
        client_id,
        client_secret,
        username,
        password: saltedPasswordHash,
        scope: scope.join(' '),
      });

      const client = axios.create({
        baseURL: baseURL,
        timeout: timeout || 120000,
        maxRedirects: 0, // Upvest API should not redirect anywhere. We use versioned endpoints instead.
      });

      const requestInterceptorHandle = client.interceptors.request.use(
        // Wraps axios-token-interceptor with oauth-specific configuration,
        // fetches the token using the desired claim method, and caches
        // until the token expires
        oauth.interceptor(tokenProvider, getOwnerCredentials)
      );

      return client;
    });

    this.client = new AsyncClientWrapper(() => clientPromise);
  }

  async echo(what) {
    const data = { echo:what };
    const response = await this.client.post('clientele/echo-oauth2', data);
    return response.data.echo;
  }

  async echoGet(what) {
    const params = { echo:what };
    const response = await this.client.get('clientele/echo-oauth2', { params });
    return response.data.echo;
  }

  get assets() {
    if (! this.assetsEndpoint) {
      this.assetsEndpoint = new AssetsEndpoint(this.client, this.passwordPacker);
    }
    return this.assetsEndpoint;
  }

  get wallets() {
    if (! this.walletsEndpoint) {
      this.walletsEndpoint = new WalletsEndpoint(this.client, this.passwordPacker);
    }
    return this.walletsEndpoint;
  }

  get transactions() {
    if (! this.transactionsEndpoint) {
      this.transactionsEndpoint = new TransactionsEndpoint(this.client, this.passwordPacker);
    }
    return this.transactionsEndpoint;
  }
}


module.exports = {
  UpvestClienteleAPI
};
