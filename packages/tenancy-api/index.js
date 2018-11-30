const util = require('util');
const axios = require('axios');
const { APIKeyAxiosInterceptor } = require('./authentication/api-key/axios-interceptor.js');
const { APIKeyDebugger } = require('./authentication/api-key/debugger.js');


class UpvestTenancyAPI {
  constructor(baseURL, key, secret, passphrase, debug=false) {
    const tenancyBaseURL = baseURL + 'tenancy/';
    this.client = axios.create({
      baseURL: tenancyBaseURL,
      timeout: 30000,
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
    const response = await this.client.post('echo-signed', data);
    return response.data.echo;
  }

  get users() {
    if (! this.usersEndpoint) {
      this.usersEndpoint = new UsersEndpoint(this.client);
    }
    return this.usersEndpoint;
  }
}


class UsersEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(username, password, clientIp, userAgent) {
    const data = {username, password, client_ip:clientIp, user_agent:userAgent};
    const response = await this.client.post('users/', data);
    return response.data;
  }

  async listByPage(pageNumber=1) {
    const params = {page: pageNumber};
    const response = await this.client.get('users/', {params});
    return response.data.results;
  }

  // TODO Figure out how to handle invalid pages due to changes in query set (i.e. during mass deletion)
  async* list() {
    let pageNumber = 1;
    do {
      const params = {page: pageNumber};
      let response;
      try {
        response = await this.client.get('users/', {params});
      }
      catch (error) {
        console.log(`Caught error while trying to get user list page # ${pageNumber}:`);
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
      // TODO Here we might want to refresh the result count in case the number of users has changed since.
      if (response.data.next != null) {
        let nextUrl = new URL(response.data.next);
        pageNumber = nextUrl.searchParams.get('page');
        // TODO Figure out how to use the whole URL in `next` instead of this parsing.
      }
      else {
        pageNumber = null;
      }
    } while (pageNumber != null);
  }

  async retrieve(username) {
    const params = {};
    const response = await this.client.get(`users/${username}`, params);
    return response.data;
  }

  async updatePassword(username, oldPassword, newPassword) {
    const data = {old_password:oldPassword, new_password:newPassword};
    const response = await this.client.patch(`users/${username}`, data);
    return response.data;
  }

  async delete(username) {
    const response = await this.client.delete(`users/${username}`);
    return response.status == 204;
  }
}


module.exports = {
  UpvestTenancyAPI
};
