

async function* genericList(pageSize, path, client) {
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
      response = await client.get(path, {params});
    }
    catch (error) {
      console.log(`Caught error while trying to get ${path} list.`);
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


class AssetsEndpoint {
  constructor(client) {
    this.client = client;
  }

  async* list(pageSize) {
    yield* genericList(pageSize, 'assets/', this.client);
  }

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`assets/${id}`, params);
    return response.data;
  }
}


class WalletsEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(assetId, password) {
    const data = {
      asset_id: assetId,
      password: password
    };
    const response = await this.client.post('kms/wallets/', data);
    return response.data;
  }

  async* list(pageSize) {
    yield* genericList(pageSize, 'kms/wallets/', this.client);
  }

  async retrieve(id) {
    const params = {};
    const response = await this.client.get(`kms/wallets/${id}`, params);
    return response.data;
  }
}


class TransactionsEndpoint {
  constructor(client) {
    this.client = client;
  }

  async create(walletId, password, recipient, assetId, quantity, fee) {
    const data = {
      password,
      recipient,
      asset_id:assetId,
      quantity:String(quantity), // String because quantity could be bigger than Number.MAX_SAFE_INTEGER
      fee:String(fee), // String because fee could be bigger than Number.MAX_SAFE_INTEGER
    };
    const response = await this.client.post(`kms/wallets/${walletId}/transactions/`, data);
    return response.data;
  }

  async* list(walletId, pageSize) {
    yield* genericList(pageSize, `kms/wallets/${walletId}/transactions/`, this.client);
  }

  async retrieve(walletId, transactionId) {
    const params = {};
    const response = await this.client.get(`/wallets/${walletId}/transactions/${transactionId}`, params);
    return response.data;
  }
}


class SignaturesEndpoint {
  constructor(client) {
    this.client = client;
  }

  async sign(walletId, password, toSign, inputFormat, outputFormat) {
    const data = {
      input_format:inputFormat,
      output_format:outputFormat,
      to_sign:toSign,
      password,
    };
    const response = await this.client.post(`kms/wallets/${walletId}/sign`, data);
    return response.data;
  }
}


module.exports = {
  AssetsEndpoint,
  WalletsEndpoint,
  TransactionsEndpoint,
  SignaturesEndpoint
};
