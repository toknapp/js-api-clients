const util = require('util');
const axios = require('axios');
const { APIKeyAxiosInterceptor } = require('./authentication/api-key/axios-interceptor.js');
const { APIKeyDebugger } = require('./authentication/api-key/debugger.js');

const { AssetsEndpoint, WalletsEndpoint, TransactionsEndpoint } = require('@upvest/api-library');


class UpvestTenancyAPI {
  constructor(baseURL, passwordPacker, key, secret, passphrase, timeout=120000, debug=false) {
    this.passwordPacker = passwordPacker;
    const tenancyBaseURL = baseURL + 'tenancy/';
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
    const params = { echo:what };
    const response = await this.client.get('tenancy/echo-signed', { params });
    return response.data.echo;
  }

  get users() {
    if (! this.usersEndpoint) {
      this.usersEndpoint = new UsersEndpoint(this.client, this.passwordPacker);
    }
    return this.usersEndpoint;
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


class UsersEndpoint {
  constructor(client, passwordPacker) {
    this.client = client;
    this.passwordPacker = passwordPacker;
  }

  async create(username, password, clientIp, userAgent) {
    const { saltedPasswordHash, userSecret } = await this.passwordPacker.pack(password);
    const data = {
      username,
      salted_password_hash: saltedPasswordHash,
      user_secret: userSecret,
      client_ip: clientIp,
      user_agent: userAgent
    };
    const response = await this.client.post('tenancy/users/', data);
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
        response = await this.client.get('tenancy/users/', {params});
      }
      catch (error) {
        console.log('Caught error while trying to get user list.');
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

  async retrieve(username) {
    const params = {};
    const response = await this.client.get(`tenancy/users/${username}`, params);
    return response.data;
  }

  async updatePassword(username, oldPassword, newPassword) {
    const { saltedPasswordHash:oldSaltedPasswordHash, userSecret:oldUserSecret } = await this.passwordPacker.pack(oldPassword);
    const { saltedPasswordHash:newSaltedPasswordHash, userSecret:newUserSecret } = await this.passwordPacker.pack(newPassword);

    const data = {
      old_salted_password_hash: oldSaltedPasswordHash,
      new_salted_password_hash: newSaltedPasswordHash,
      old_user_secret: oldUserSecret,
      new_user_secret: newUserSecret
    };
    const response = await this.client.patch(`tenancy/users/${username}`, data);
    return response.status == 200;
  }

  async delete(username) {
    const response = await this.client.delete(`tenancy/users/${username}`);
    return response.status == 204;
  }
}


module.exports = {
  UpvestTenancyAPI
};
