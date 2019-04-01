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

  async create(url, headers, version, status, events) {
    const data = { url, headers, version, status, events };
    const response = await this.client.post('tenancy/webhooks/', data);
    return response.data;
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
        response = await this.client.get('tenancy/webhooks/', {params});
      }
      catch (error) {
        console.log('Caught error while trying to get webhook list.');
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
        return; // Stop iteration.
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

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`tenancy/webhooks/${id}`, params);
    return response.data;
  }

  async update(id, url, headers, version, status, events) {
    const data = { url, headers, version, status, events };
    const response = await this.client.patch(`tenancy/webhooks/${id}`, data);
    return response.status == 200;
  }

  async delete(id) {
    const response = await this.client.delete(`tenancy/webhooks/${id}`);
    return response.status == 204;
  }
}


module.exports = {
  UpvestTenancyAPI
};
