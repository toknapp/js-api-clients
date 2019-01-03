const util = require('util');
const axios = require('axios');
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');

const { WalletsEndpoint, TransactionsEndpoint } = require('@upvest/api-library');


class UpvestClienteleAPI {
  constructor(baseURL, client_id, client_secret, username, password, scope=['read', 'write', 'echo', 'wallet', 'transaction'], timeout=120000) {
    const OAuth2TokenURL = baseURL + 'clientele/oauth2/token';

    this.getOwnerCredentials = oauth.client(axios.create(), {
      url: OAuth2TokenURL,
      grant_type: 'password',
      client_id: client_id,
      client_secret: client_secret,
      username: username,
      password: password,
      scope: scope.join(' '),
    });

    this.client = axios.create({
      baseURL: baseURL,
      timeout: timeout || 120000,
      maxRedirects: 0, // Upvest API should not redirect anywhere. We use versioned endpoints instead.
    });

    this.requestInterceptorHandle = this.client.interceptors.request.use(
      // Wraps axios-token-interceptor with oauth-specific configuration,
      // fetches the token using the desired claim method, and caches
      // until the token expires
      oauth.interceptor(tokenProvider, this.getOwnerCredentials)
    );
  }

  async echo(what) {
    const data = {echo: what};
    const response = await this.client.post('clientele/echo-oauth2', data);
    return response.data.echo;
  }

  get wallets() {
    if (! this.walletsEndpoint) {
      this.walletsEndpoint = new WalletsEndpoint(this.client);
    }
    return this.walletsEndpoint;
  }

  get transactions() {
    if (! this.transactionsEndpoint) {
      this.transactionsEndpoint = new TransactionsEndpoint(this.client);
    }
    return this.transactionsEndpoint;
  }
}


module.exports = {
  UpvestClienteleAPI
};
