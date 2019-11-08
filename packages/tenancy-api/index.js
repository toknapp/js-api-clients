const util = require('util');
const axios = require('axios');
const { APIKeyAxiosInterceptor } = require('./authentication/api-key/axios-interceptor.js');
const { APIKeyDebugger } = require('./authentication/api-key/debugger.js');

const {
  AssetsEndpoint, WalletsEndpoint, TransactionsEndpoint, SignaturesEndpoint, UtxosEndpoint,
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

  async time(requestId) {
    const response = await this.client.get('time/', {requestId});
    return response.data;
  }

  async echo(what, requestId) {
    const data = {echo: what};
    const response = await this.client.post('tenancy/echo-signed', data, {requestId});
    return response.data.echo;
  }

  async echoGet(what, requestId) {
    const data = {echo: what};
    const response = await this.client.get('tenancy/echo-signed', {params:data, requestId});
    return response.data.echo;
  }

  get users() {
    if (! this.usersEndpoint) {
      this.usersEndpoint = new UsersEndpoint(this.client);
    }
    return this.usersEndpoint;
  }

  get webhooks() {
    if (! this.webhooksEndpoint) {
      this.webhooksEndpoint = new WebhooksEndpoint(this.client);
    }
    return this.webhooksEndpoint;
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

  get utxos() {
    if (! this.utxosEndpoint) {
      this.utxosEndpoint = new UtxosEndpoint(this.client);
    }
    return this.utxosEndpoint;
  }
}


class UsersEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(username, password, clientIp, userAgent, assetIds, asynchronously, rawRecoverykit, requestId) {
    const data = {
      username,
      password,
      client_ip: clientIp,
      user_agent: userAgent,
      asset_ids: assetIds,
      raw: Boolean(rawRecoverykit),
      "async": Boolean(asynchronously),
    };
    const response = await this.client.post('tenancy/users/', data, {requestId});
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

  async recover(seed, seedhash, userId, password) {
    const data = { seed, seedhash, user_id:userId, password };
    const response = await this.client.post(`tenancy/recover/`, data);
    return response.data;
  }

  async delete(username) {
    const response = await this.client.delete(`tenancy/users/${encodeURIComponent(username)}`);
    return response.status == 204;
  }
}


class WebhooksEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(url, headers, version, status, name, hmacSecretKey, eventFilters) {
    const data = { url, headers, version, status, name, hmac_secret_key:hmacSecretKey, event_filters:eventFilters };
    const response = await this.client.post('tenancy/webhooks/', data);
    return response.data;
  }

  async verifyBaseUrl(baseUrl) {
    const data = { verify_url:baseUrl };
    const response = await this.client.post('tenancy/webhooks-verify/', data);
    return response.data;
  }

  async* list(pageSize) {
    yield* genericList('tenancy/webhooks/', this.client, pageSize);
  }

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`tenancy/webhooks/${id}`, params);
    return response.data;
  }

  // // This is not yet implemented on the actual API.
  // // TODO Uncomment when the API becomes available.
  // //
  // // The semantics of updating `eventFilters` is too complex, and therefore
  // // is left out.
  // //
  // // fieldsToUpdate = { url, headers, version, status, name, hmacSecretKey }
  // //
  // async update(id, fieldsToUpdate) {
  //   // hmacSecretKey => hmac_secret_key
  //   const data = Object.assign({ hmac_secret_key:fieldsToUpdate['hmacSecretKey'] }, fieldsToUpdate, { hmacSecretKey:undefined });
  //   const response = await this.client.patch(`tenancy/webhooks/${id}`, data);
  //   return response.status == 200;
  // }

  async delete(id) {
    const response = await this.client.delete(`tenancy/webhooks/${id}`);
    return response.status == 204;
  }
}


module.exports = {
  UpvestTenancyAPI
};
