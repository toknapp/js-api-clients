const {
  getSaltedPasswordHashSHA512,
  getUserSecretCiphertext,
} = require('./crypto.js');

// TODO Consider putting this into it's own NPM package.
class PasswordPacker {
  constructor(config) {
    this.config = config;
  }

  async hash(password) {
    // this.config.hash == {
    //   "function": "sha512",
    //   "params": {
    //     "salt_position": "suffix",
    //     "salt": "gTkdWPxRgyTQt2LSiovr",
    //     "digest_format": "hex"
    //   }
    // }
    let saltedPasswordHash;
    if ('sha512' == this.config.hash.function) {
      return await getSaltedPasswordHashSHA512(
        password,
        this.config.hash.params.salt,
        this.config.hash.params.salt_position,
        this.config.hash.params.digest_format,
      );
    }
    throw Error('Unsupported password hashing configuration.')
  }

  async encrypt(password) {
    // this.config.encryption == {
    //   "usk": {
    //     "pubkey": "xBF7Yec2cFHwm2jhHIPDluqRES9mqUGz9lE7yOw1E1k="
    //   }
    // }
    return {
      usk: this.config.encryption.usk,
      ciphertext: await getUserSecretCiphertext(password, this.config.encryption.usk.pubkey),
    };
  }

  async pack(password) {
    return {
      saltedPasswordHash: await this.hash(password),
      userSecret: await this.encrypt(password)
    };
  }
}


class AsyncClientWrapper {
  constructor(asyncClientGetter) {
    this.asyncClientGetter = asyncClientGetter;
    for (const method of this.default_methods) {
      this[method] = async function(...params) {
        return await (await this.asyncClientGetter())[method](...params);
      }
    }
  }

  get default_methods() {
    return [
      'delete',
      'get',
      'head',
      'options',
      'patch',
      'post',
      'put',
    ]
  }

  // async get(...params) {
  //   return await (await this.asyncClientGetter()).get(...params);
  // }
}


class AssetsEndpoint {
  constructor(client, passwordPacker) {
    this.client = client;
    this.passwordPacker = passwordPacker;
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
        response = await this.client.get('assets/', {params});
      }
      catch (error) {
        console.log('Caught error while trying to get assets list.');
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

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`assets/${id}`, params);
    return response.data;
  }
}


class WalletsEndpoint {
  constructor(client, passwordPacker) {
    this.client = client;
    this.passwordPacker = passwordPacker;
  }

  async create(assetId, password) {
    const userSecret = await this.passwordPacker.encrypt(password);
    const data = {
      asset_id: assetId,
      user_secret: userSecret
    };
    const response = await this.client.post('kms/wallets/', data);
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

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`kms/wallets/${id}`, params);
    return response.data;
  }
}


class TransactionsEndpoint {
  constructor(client, passwordPacker) {
    this.client = client;
    this.passwordPacker = passwordPacker;
  }

  async create(walletId, password, recipient, symbol, quantity, fee) {
    const userSecret = await this.passwordPacker.encrypt(password);
    const data = {
      wallet_id: walletId,
      user_secret: userSecret,
      recipient,
      symbol,
      quantity: String(quantity), // String because quantity could be bigger than Number.MAX_SAFE_INTEGER
      fee: String(fee), // String because fee could be bigger than Number.MAX_SAFE_INTEGER
    };
    const response = await this.client.post('tx/', data);
    return response.data;
  }
}


module.exports = {
  AsyncClientWrapper,
  PasswordPacker,
  AssetsEndpoint,
  WalletsEndpoint,
  TransactionsEndpoint
};
