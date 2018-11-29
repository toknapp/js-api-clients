const util = require('util');
const axios = require('axios');
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');

class UpvestClienteleAPI {
  constructor(baseURL, client_id, client_secret, username, password, scope=['read', 'write', 'echo']) {
    const OAuth2TokenURL = baseURL + 'clientele/oauth/token/';

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
      timeout: 30000,
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
}

module.exports = {
  UpvestClienteleAPI
};
