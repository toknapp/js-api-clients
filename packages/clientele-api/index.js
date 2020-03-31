const util = require('util');
const axios = require('axios');
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');

const {
  AssetsEndpoint,
  WalletsEndpoint,
  TransactionsEndpoint,
  SignaturesEndpoint,
  UtxosEndpoint,
  createHTTPClient,
  buildConfig,
  Struct,
} = require('@upvest/api-library');

const ClienteleOAuthConfig = Struct('baseURL', 'oauth2Token', 'timeout', 'debug', 'userAgent');

const ClienteleConfig = Struct(
  'baseURL',
  'client_id',
  'client_secret',
  'username',
  'password',
  'scope',
  'timeout',
  'debug',
  'userAgent'
);

class BaseUpvestClienteleAPI {
  constructor(client) {
    this.client = client;
  }

  async echo(what) {
    const data = {echo: what};
    const response = await this.client.post('clientele/echo-oauth2', data);
    return response.data.echo;
  }

  async echoGet(what) {
    const data = {echo: what};
    const response = await this.client.get('clientele/echo-oauth2', {params: data});
    return response.data.echo;
  }

  async offboard(password) {
    const response = await this.client.post(
      'clientele/offboard',
      {password},
      {responseType: 'arraybuffer'}
    );
    return response.data;
  }

  get assets() {
    if (!this.assetsEndpoint) {
      this.assetsEndpoint = new AssetsEndpoint(this.client);
    }
    return this.assetsEndpoint;
  }

  get wallets() {
    if (!this.walletsEndpoint) {
      this.walletsEndpoint = new WalletsEndpoint(this.client);
    }
    return this.walletsEndpoint;
  }

  get transactions() {
    if (!this.transactionsEndpoint) {
      this.transactionsEndpoint = new TransactionsEndpoint(this.client);
    }
    return this.transactionsEndpoint;
  }

  get signatures() {
    if (!this.signaturesEndpoint) {
      this.signaturesEndpoint = new SignaturesEndpoint(this.client);
    }
    return this.signaturesEndpoint;
  }

  get utxos() {
    if (!this.utxosEndpoint) {
      this.utxosEndpoint = new UtxosEndpoint(this.client);
    }
    return this.utxosEndpoint;
  }
}

class UpvestClienteleAPI extends BaseUpvestClienteleAPI {
  constructor(config) {
    config = buildConfig(config);
    const OAuth2TokenURL = config.baseURL + 'clientele/oauth2/token';

    const getFreshOAuth2Token = () => {
      return oauth
        .client(axios.create(), {
          url: OAuth2TokenURL,
          grant_type: 'password',
          client_id: config.client_id,
          client_secret: config.client_secret,
          username: config.username,
          password: config.password,
          scope: config.scope.join(' '),
        })()
        .then(token => {
          token.granted_at = Date.now();
          return token;
        });
    };

    const getCachedToken = tokenProvider.tokenCache(getFreshOAuth2Token, {
      getMaxAge: res => res.expires_in * 1000,
    });

    const client = createHTTPClient(config);

    const requestInterceptorHandle = client.interceptors.request.use(
      // Wraps axios-token-interceptor with oauth-specific configuration,
      // fetches the token using the desired claim method, and caches
      // until the token expires
      tokenProvider({
        getToken: getCachedToken,
        headerFormatter: res => 'Bearer ' + res.access_token,
      })
    );

    super(client);
    this.getFreshOAuth2Token = getFreshOAuth2Token;
    this.getCachedToken = getCachedToken;
    this.requestInterceptorHandle = requestInterceptorHandle;
  }
}

class UpvestClienteleAPIFromOAuth2Token extends BaseUpvestClienteleAPI {
  constructor(config) {
    // FIXME[yao]: validate config is correct schema, in this case, ClienteleOAuthConfig
    config = buildConfig(config);
    const OAuth2TokenURL = config.baseURL + 'clientele/oauth2/token';

    if (!oauth2Token.granted_at) {
      oauth2Token.granted_at = Date.now(); // This default is most likely wrong, but we don't have anything better.
    }

    config.oauth2Token.expires_in -= (Date.now() - config.oauth2Token.granted_at) / 1000;

    const getFreshOAuth2Token = () => Promise.resolve(config.oauth2Token);

    const getCachedToken = tokenProvider.tokenCache(getFreshOAuth2Token, {
      getMaxAge: res => res.expires_in * 1000,
    });

    // create the httpc leint
    client = createHTTPClient(config);
    const requestInterceptorHandle = client.interceptors.request.use(
      // Wraps axios-token-interceptor with oauth-specific configuration,
      // fetches the token using the desired claim method, and caches
      // until the token expires
      tokenProvider({
        getToken: getCachedToken,
        headerFormatter: res => 'Bearer ' + res.access_token,
      })
    );

    super(client);
    this.getFreshOAuth2Token = getFreshOAuth2Token;
    this.getCachedToken = getCachedToken;
    this.requestInterceptorHandle = requestInterceptorHandle;
  }
}

module.exports = {
  UpvestClienteleAPI,
  UpvestClienteleAPIFromOAuth2Token,
  ClienteleConfig,
  ClienteleOAuthConfig,
};
