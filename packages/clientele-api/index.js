const util = require('util');
const axios = require('axios');
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');

class UpvestClienteleAPI {
  constructor(baseURL, client_id, client_secret, username, password, scope=['read', 'write', 'echo'], timeout=120000) {
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
}


// TODO Refactor this copied code (see packages/tenancy-api/index.js )
class WalletsEndpoint {
  constructor(client) {
    this.client = client;
  }

  async* list(pageSize) {
    let cursor = null;
    do {
      const params = {};
      if (cursor) {
        params['cursor'] = cursor;
      }
      if (pageSize) {
        params['page_size'] = pageSize;
      }
      let response;
      try {
        response = await this.client.get('kms/wallets/', {params});
      }
      catch (error) {
        console.log('Caught error while trying to get wallet list.');
        if ('response' in error) {
          console.dir(error.response.config.url, {depth:null, colors:true});
          console.dir(error.response.config.headers, {depth:null, colors:true});
          console.dir(error.response.status, {depth:null, colors:true});
          console.dir(error.response.data, {depth:null, colors:true});
        }
        else {
          console.log('Caught error without response:');
          console.dir(error, {depth:null, colors:true});
        }
        return;
      }
      for (const result of response.data.results) {
        yield result;
      }
      if (response.data.next != null) {
        let nextUrl = new URL(response.data.next);
        cursor = nextUrl.searchParams.get('cursor');
        // TODO Figure out how to use the whole URL in `next` instead of this parsing.
      }
      else {
        cursor = null;
      }
    } while (cursor != null);
  }

  async retrieve(uuid) {
    const params = {};
    const response = await this.client.get(`kms/wallets/${uuid}`, params);
    return response.data;
  }
}


module.exports = {
  UpvestClienteleAPI
};
