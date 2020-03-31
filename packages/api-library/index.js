const axios = require('axios');
const pjson = require('../../package.json');

const defaultUserAgent = `Upvest-JS-API-Client/${pjson.version}`;

const Struct = (...keys) => (...v) =>
  keys.reduce((o, k, i) => {
    o[k] = v[i];
    return o;
  }, {});

const _defaultBaseConfig = Struct('timeout', 'debug', 'userAgent')(120000, false, defaultUserAgent);

function buildConfig(config) {
  // merge config into the default base configs, overriding defaults
  return {..._defaultBaseConfig, ...config};
}

function createHTTPClient(config) {
  //use actual package version from package.json
  client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    maxRedirects: 0, // Upvest API should not redirect anywhere. We use versioned endpoints instead.
  });

  client.defaults.headers.common['User-Agent'] = config.userAgent;

  return client;
}

function defaultListErrorHandler(error, path) {
  console.log(`Caught error while trying to get ${path} list.`);
  if ('response' in error) {
    if ('config' in error.response) {
      if ('url' in error.response.config) {
        console.dir(error.response.config.url, {depth: null, colors: true});
      }
      if ('headers' in error.response.config) {
        console.dir(error.response.config.headers, {depth: null, colors: true});
      }
    }
    if ('status' in error.response) {
      console.dir(error.response.status, {depth: null, colors: true});
    }
    if ('data' in error.response) {
      console.dir(error.response.data, {depth: null, colors: true});
    }
  } else {
    console.log('Caught error without response:');
    console.dir(error, {depth: null, colors: true});
  }
  return;
}

async function* genericList(path, client, pageSize, errorHandler) {
  if (!errorHandler) {
    errorHandler = defaultListErrorHandler;
  }
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
    } catch (error) {
      return errorHandler(error, path);
    }
    for (const result of response.data.results) {
      yield result;
    }
    if (response.data.next != null) {
      let nextUrl = new URL(response.data.next);
      cursor = nextUrl.searchParams.get('cursor');
      // TODO Figure out how to use the whole URL in `next` instead of this parsing.
    } else {
      cursor = null;
    }
  } while (cursor != null);
}

class AssetsEndpoint {
  constructor(client) {
    this.client = client;
  }

  async *list(pageSize) {
    yield* genericList('assets/', this.client, pageSize);
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

  async create(assetId, password, index, requestId) {
    const data = {
      asset_id: assetId,
      password: password,
      index: index,
    };
    const response = await this.client.post('kms/wallets/', data, {requestId});
    return response.data;
  }

  async *list(pageSize) {
    yield* genericList('kms/wallets/', this.client, pageSize);
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

  async create(
    walletId,
    password,
    recipient,
    assetId,
    quantity,
    fee,
    asynchronously,
    inputs,
    fund
  ) {
    const data = {
      password,
      recipient,
      asset_id: assetId,
      quantity: String(quantity), // String because quantity could be bigger than Number.MAX_SAFE_INTEGER
      fee: String(fee), // String because fee could be bigger than Number.MAX_SAFE_INTEGER
      async: Boolean(asynchronously),
      inputs,
      fund: fund === Boolean(fund) ? fund : undefined, // `undefined` excludes from JSON payload, which triggers the "legacy behaviour" of leaving the default up to the API
    };
    const response = await this.client.post(`kms/wallets/${walletId}/transactions/`, data);
    return response.data;
  }

  async createRaw(walletId, password, rawTx, inputFormat, fund) {
    const data = {
      password,
      raw_tx: rawTx,
      input_format: inputFormat,
      fund: fund === false ? false : true,
    };
    const response = await this.client.post(`kms/wallets/${walletId}/transactions/raw`, data);
    return response.data;
  }

  async createComplex(walletId, password, tx, fund) {
    const data = {
      password,
      tx,
      fund: fund === false ? false : true,
    };
    const response = await this.client.post(`kms/wallets/${walletId}/transactions/complex`, data);
    return response.data;
  }

  async *list(walletId, pageSize) {
    yield* genericList(`kms/wallets/${walletId}/transactions/`, this.client, pageSize);
  }

  async retrieve(walletId, transactionId) {
    const params = {};
    const response = await this.client.get(
      `kms/wallets/${walletId}/transactions/${transactionId}`,
      params
    );
    return response.data;
  }
}

class SignaturesEndpoint {
  constructor(client) {
    this.client = client;
  }

  async sign(walletId, password, toSign, inputFormat, outputFormat) {
    const data = {
      input_format: inputFormat,
      output_format: outputFormat,
      to_sign: toSign,
      password,
    };
    const response = await this.client.post(`kms/wallets/${walletId}/sign`, data);
    return response.data;
  }
}

class UtxosEndpoint {
  constructor(client) {
    this.client = client;
  }

  async *list(walletId) {
    const path = `kms/wallets/${walletId}/utxos/`;
    let response;
    try {
      response = await this.client.get(path, {});
    } catch (error) {
      return defaultListErrorHandler(error, path);
    }
    for (const result of response.data.utxos) {
      yield result;
    }
  }
}

module.exports = {
  AssetsEndpoint,
  WalletsEndpoint,
  TransactionsEndpoint,
  SignaturesEndpoint,
  UtxosEndpoint,
  genericList,
  defaultListErrorHandler,
  buildConfig,
  createHTTPClient,
  Struct,
};
