const util = require('util');
const axios = require('axios');
const { APIKeyAxiosInterceptor } = require('./authentication/api-key/axios-interceptor.js');
const { APIKeyDebugger } = require('./authentication/api-key/debugger.js');

const {
  AssetsEndpoint, WalletsEndpoint, TransactionsEndpoint, SignaturesEndpoint,
  genericList, defaultListErrorHandler,
} = require('@upvest/api-library');


class UpvestTenancyAPI {
  constructor(baseURL, key, secret, passphrase, timeout=120000, debug=false) {
    this.client = axios.create({
      baseURL: baseURL,
      timeout: timeout || 120000,
      maxRedirects: 0, // Upvest API should not redirect anywhere. We use versioned endpoints instead.
    });

    this.interceptor = new APIKeyAxiosInterceptor(key, secret, passphrase);

    if (debug) {
      new APIKeyDebugger(this.interceptor); // Will inject itself into this.interceptor
    }

    this.requestInterceptorHandle = this.client.interceptors.request.use(
      this.interceptor.getRequestInterceptor(),
      this.interceptor.getRequestErrorInterceptor(),
    );

    this.responseInterceptorHandle = this.client.interceptors.response.use(
      this.interceptor.getResponseInterceptor(),
      this.interceptor.getResponseErrorInterceptor(),
    );
  }

  async echo(what) {
    const data = {echo: what};
    const response = await this.client.post('tenancy/echo-signed', data);
    return response.data.echo;
  }

  async echoGet(what) {
    const data = {echo: what};
    const response = await this.client.get('tenancy/echo-signed', {params:data});
    return response.data.echo;
  }

  get users() {
    if (! this.usersEndpoint) {
      this.usersEndpoint = new UsersEndpoint(this.client);
    }
    return this.usersEndpoint;
  }

  get assets() {
    if (! this.assetsEndpoint) {
      this.assetsEndpoint = new AssetsEndpoint(this.client);
    }
    return this.assetsEndpoint;
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

  get signatures() {
    if (! this.signaturesEndpoint) {
      this.signaturesEndpoint = new SignaturesEndpoint(this.client);
    }
    return this.signaturesEndpoint;
  }
}


class UsersEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(username, password, clientIp, userAgent, assetIds, asynchronously) {
    const data = {username, password, client_ip:clientIp, user_agent:userAgent, asset_ids:assetIds};
    const path = asynchronously ? 'tenancy/user-create-async' : 'tenancy/users/';
    const response = await this.client.post(path, data);
    return response.data;
  }

  async* list(pageSize) {
    yield* genericList('tenancy/users/', this.client, pageSize);
  }

  async retrieve(username) {
    const params = {};
    const response = await this.client.get(`tenancy/users/${encodeURIComponent(username)}`, params);
    return response.data;
  }

  async updatePassword(username, oldPassword, newPassword) {
    const data = {old_password:oldPassword, new_password:newPassword};
    const response = await this.client.patch(`tenancy/users/${encodeURIComponent(username)}`, data);
    return response.status == 200;
  }

  async delete(username) {
    const response = await this.client.delete(`tenancy/users/${encodeURIComponent(username)}`);
    return response.status == 204;
  }
}


module.exports = {
  UpvestTenancyAPI
};
