const axios = require('axios');
const axiosRateLimit = require('axios-rate-limit');
const WebSocket = require('ws');
const {
  payments:bitcoinPayments, networks:bitcoinNetworks, script:bitcoinScript,
  address:bitcoinAddress, crypto:bitcoinCrypto, ECPair, Psbt,
} = require('bitcoinjs-lib');

const {
  inspect, inspectError, getWebsocketMessageGenerator,
} = require('./util.js');


// Adapted from https://github.com/bitcoinjs/bitcoinjs-lib/issues/1282#issuecomment-445550666
const utxoScriptToAddressAndPaymentType = (script, networkObj) => {
  let address;
  for (const paymentType of Object.keys(bitcoinPayments)) {
    let payment;
    try {
      payment = bitcoinPayments[paymentType]({ output: Buffer.from(script, 'hex'), network: networkObj });
    }
    catch (err) {
      continue;
    }
    return {
      address: payment.address ? payment.address : null,
      type: paymentType,
    }
  }
  return {
    address: null,
    type: null,
  }
};


const getPubKeyHashAddressFromPubKey = (pubkey, networkObj) => {
  const hash = bitcoinCrypto.hash160(pubkey);
  return bitcoinAddress.toBase58Check(hash, networkObj.pubKeyHash);
}


class BitcoinViaBlockCypher {
  constructor(cfg) {
    this.cfg = cfg;

    const bcyCfg = this.cfg.blockCypher;
    const baseURL = `https://api.blockcypher.com/v1/${bcyCfg.coin}/${bcyCfg.chain}`;
    this.websocketURL = `wss://socket.blockcypher.com/v1/${bcyCfg.coin}/${bcyCfg.chain}?token=${bcyCfg.apiToken}`;

    this.client = axiosRateLimit(
      axios.create({
        baseURL: baseURL,
        timeout: bcyCfg.timeout || 120000,
        // // TODO Find out if blockcypher does redirect?
        // maxRedirects: 0,
      }),
      {
        maxRequests: bcyCfg.rateLimitRequestsPerSecond,
        perMilliseconds: 1000,
        // maxRPS: 3,
      }
    );

    this.networkObj = {
      test3: bitcoinNetworks.testnet,
      main: bitcoinNetworks.bitcoin,
    }[bcyCfg.chain];

    this.rateLimitRemaining = 200;

    this.resetCache();
  }

  resetCache() {
    this.cache = {};
  }

  observeRateLimitRemaining(response) {
    if ('x-ratelimit-remaining' in response.headers) {
      this.rateLimitRemaining = Number(response.headers['x-ratelimit-remaining']);
      inspect(`BlockCypher rate limit remaining: ${this.rateLimitRemaining}`);
    }
  }

  async get(path, params) {
    params = params || {};
    params['token'] = this.cfg.blockCypher.apiToken;
    const response = await this.client.get(path, {params});
    this.observeRateLimitRemaining(response);
    return response.data;
  }

  async post(path, payload, params) {
    params = params || {};
    params['token'] = this.cfg.blockCypher.apiToken;
    const response = await this.client.post(path, payload, {params});
    this.observeRateLimitRemaining(response);
    return response.data;
  }

  async addressWithUtxos(address, before) {
    before = before === Infinity ? undefined : before;
    return await this.get(`/addrs/${address}`, {unspentOnly: 'true', includeScript: 'true', before});
  }

  async addressWithUtxosCached(address, before) {
    const cacheId = `addressWithUtxos:${address}:${before}`;
    if (!(cacheId in this.cache)) {
      this.cache[cacheId] = await this.addressWithUtxos(address, before);
    }
    return this.cache[cacheId];
  }

  async txDetails(hash) {
    return await this.get(`/txs/${hash}`, { includeHex: true });
  }

  async txDetailsCached(hash) {
    const cacheId = `txDetails:${hash}`;
    if (!(cacheId in this.cache)) {
      this.cache[cacheId] = await this.txDetails(hash);
    }
    return this.cache[cacheId];
  }

  async chainDetails() {
    return await this.get(``);
  }

  async chainDetailsCached() {
    const cacheId = `chainDetails`;
    if (!(cacheId in this.cache)) {
      this.cache[cacheId] = await this.chainDetails();
    }
    return this.cache[cacheId];
  }

  async getFeeForVirtualSize(vsize) {
    const feePerKilobyte = (await this.chainDetailsCached()).high_fee_per_kb;
    return Math.ceil(vsize * feePerKilobyte / 1024);
  }

  async sendRawTx(rawTx) {
    return await this.post(`/txs/push`, { tx: rawTx });
  }

  async getUtxos(address, requestedValue=Infinity) {
    const utxos = [];
    let hasMoreUtxos = true;
    let cumulativeUtxoValue = 0;
    let lowestBlockHeightSeen = Infinity;
    while (hasMoreUtxos && (cumulativeUtxoValue < requestedValue)) {
      const A = await this.addressWithUtxosCached(address, lowestBlockHeightSeen);
      for (const txref of A.txrefs) {
        const utxo = {
          tx: txref.tx_hash,
          index: txref.tx_output_n,
          value: txref.value,
          script: txref.script,
          blockHeight: txref.block_height,
        };
        const { address:addressFromScript, type } = utxoScriptToAddressAndPaymentType(txref.script, this.networkObj);
        if (addressFromScript == address) {
          utxo.type = type;
        }
        utxo.isSegwit = (utxo.type == 'p2wpkh' || utxo.type == 'p2wsh');
        utxos.push(utxo);
        cumulativeUtxoValue += utxo.value;
        if (cumulativeUtxoValue >= requestedValue) {
          break;
        }
        lowestBlockHeightSeen = Math.min(lowestBlockHeightSeen, utxo.blockHeight);
      }

      hasMoreUtxos = Boolean(A.hasMore);
    }

    return { utxos, summedUtxoValue:cumulativeUtxoValue };
  }

  async buildFaucetTransaction(keyPair, inputs, to, value, fee) {
    const fromAddress = getPubKeyHashAddressFromPubKey(keyPair.publicKey, this.networkObj);

    const psbt = new Psbt({ network: this.networkObj });
    psbt.setVersion(1);

    let inputValuesTotal = 0;
    for (const input of inputs) {
      inputValuesTotal += input.value;

      const psbtInput = {
        hash: input.tx,
        index: input.index,
      }
      if (input.isSegwit) {
        psbtInput.witnessUtxo = {
          script: Buffer.from(input.script, 'hex'),
          value: input.value,
        };
      } else {
        const inputTxDetails = await this.txDetailsCached(input.tx);
        const inputTxRaw = inputTxDetails.hex;
        psbtInput.nonWitnessUtxo = Buffer.from(inputTxRaw, 'hex');
      }
      psbt.addInput(psbtInput);
    }

    const change = inputValuesTotal - value - fee;

    // destination address
    psbt.addOutput({ address: to, value: value });

    // change address
    psbt.addOutput({ address: fromAddress, value: change });

    for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
      psbt.signInput(inputIndex, keyPair);
    }

    // you can use validate signature method provided by library to make sure generated signature is valid
    psbt.validateSignaturesOfAllInputs(); // if this returns false, then you can throw the error
    // remove extra/unnecessary transaction data to reduce transaction size
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    return {
      hexTransaction: tx.toHex(),
      virtualSize: tx.virtualSize(),
      hash: tx.getId(),
    }
  }

  async faucet(to, value) {
    const keyPair = ECPair.fromWIF(this.cfg.holder.privateKeyWif, this.networkObj);
    let hexTransaction = null;
    let hash = null;
    let virtualSize = 500;
    let previousVirtualSize;
    let retryCountDown = 10;
    do {
      previousVirtualSize = virtualSize;
      const fee = await this.getFeeForVirtualSize(virtualSize);
      const { utxos } = await this.getUtxos(this.cfg.holder.address, value + fee);
      ({ hexTransaction, virtualSize, hash } = await this.buildFaucetTransaction(keyPair, utxos, to, value, fee));
      retryCountDown--;
    } while (retryCountDown && virtualSize != previousVirtualSize)

    const sendResult = await this.sendRawTx(hexTransaction);
    this.resetCache();
    return sendResult;
  }

  waitForConfirmations(hash) {
    const NORMAL_CLOSURE = 1000; // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
    return new Promise((resolveWaitPromise, rejectWaitPromise) => {
      const ws = new WebSocket(this.websocketURL);

      const bail = (...reasons) => {
        try {
          ws.close();
        }
        catch (e) {
          // pass
        }
        ws.removeAllListeners();
        rejectWaitPromise(...reasons);
      }

      ws.on('unexpected-response', (request, response) => {
        // request {http.ClientRequest}
        // response {http.IncomingMessage}
        // inpect('websocket unexpected response', request, response);
        bail({ request, response });
      });

      ws.on('error', error => {
        // error {Error}
        // inpect('websocket error', error);
        bail({ error });
      });

      ws.on('close', (code, reason) => {
        // code {Number}
        // reason {String}
        // inspect('websocket close', code, reason);
        ws.removeAllListeners();
        if (code == NORMAL_CLOSURE) {
          resolveWaitPromise({ msg:'closed with NORMAL_CLOSURE', code, reason });
        }
        else {
          rejectWaitPromise({ msg:'closed without NORMAL_CLOSURE', code, reason });
        }
      });

      ws.on('open', () => {
        ws.send(JSON.stringify({ event: 'unconfirmed-tx' }));
        // ws.send(JSON.stringify({ event: 'unconfirmed-tx', hash: hash }));
      })

      let count = 0;

      ws.on('message', message => {
        const msgData = JSON.parse(message);
        inspect(msgData);
        count++;
        if (count > 3) {
          ws.close(NORMAL_CLOSURE, 'normal closure');
          resolveWaitPromise('closed after 3 messages');
        }
      });
    });
  }

  async* getUnconfirmedTxs(maxCount) {
    const NORMAL_CLOSURE = 1000; // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent

    let count = 0;

    const ws = new WebSocket(this.websocketURL);

    ws.on('open', () => {
      ws.send(JSON.stringify({ event: 'unconfirmed-tx' }));
    });

    const getDoneState = msg => ++count >= maxCount;

    for await (const message of getWebsocketMessageGenerator(ws, getDoneState)) {
      yield JSON.parse(message);
    }

    ws.removeAllListeners();
    ws.close(NORMAL_CLOSURE, 'normal closure');
  }

  async* getConfirmations(hash, maxCount) {
    const NORMAL_CLOSURE = 1000; // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent

    let count = 0;

    const ws = new WebSocket(this.websocketURL);

    ws.on('unexpected-response', (request, response) => {
      // request {http.ClientRequest}
      // response {http.IncomingMessage}
      inpect('getConfirmations() websocket unexpected response', request, response);
    });

    ws.on('error', error => {
      // error {Error}
      inpect('getConfirmations() websocket error', error);
    });

    ws.on('close', (code, reason) => {
      // code {Number}
      // reason {String}
      inspect('getConfirmations() websocket close', code, reason);
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({
        token: this.cfg.blockCypher.apiToken,
        event: 'tx-confirmation',
        hash,
        confirmations: maxCount,
      }));
    });

    const pingIntervalHandle = setInterval(() => ws.send(JSON.stringify({event: "ping"})), 10000);

    const getDoneState = msg => {
      const msgData = JSON.parse(msg);
      if ('event' in msgData && msgData.event == 'pong') {
        return false;
      }
      else {
        return ++count >= maxCount;
      }
    };

    for await (const message of getWebsocketMessageGenerator(ws, getDoneState)) {
      const msgData = JSON.parse(msg);
      if ('event' in msgData && msgData.event == 'pong') {
        continue;
      }
      yield JSON.parse(message);
    }

    clearInterval(pingIntervalHandle);
    ws.removeAllListeners();
    ws.close(NORMAL_CLOSURE, 'normal closure');
  }
}

module.exports = { BitcoinViaBlockCypher };
