const axios = require('axios');

// 'divided by 10 to convert it to gwei' * Gwei (1e9)
const egsToWei = egsPrice => Number(egsPrice) * 1e8;

// 'Waiting time (in minutes)'
const egsToSeconds = egsWait => Number(egsWait) * 60;


class EthGasStation {
  constructor(cfg) {
    this.cfg = cfg || {};

    const baseURL = 'https://ethgasstation.info/json/ethgasAPI.json';

    this.client = axios.create({
      baseURL: baseURL,
      timeout: this.cfg.timeout || 2 * 60 * 1000,
      // // TODO Find out if ethgasstation does redirect?
      // maxRedirects: 0,
    });

    this.resetCache();
  }

  get ttl() {
    return Number(this.cfg.ttl || 3 * 60);
  }

  resetCache() {
    this.cache = {};
    this.cacheProcessed = {};
    this.cacheTimestamp = 0;
  }

  async refreshCache() {
    if (Date.now() > (this.cacheTimestamp + (this.ttl * 1000))) {
      this.cache = await this.getFreshData();
      this.cacheProcessed = this.process(this.cache);
      this.cacheTimestamp = Date.now();
    }
  }

  async getFreshData(params) {
    params = params || {};
    const response = await this.client.get('', {params});
    return response.data;
  }

  process(egsResponse) {
    let dataPoints = [];
    if ('gasPriceRange' in egsResponse) {
      dataPoints = Object.entries(egsResponse['gasPriceRange']).map(
        entry => [egsToWei(entry[0]), egsToSeconds(entry[1])]
      );
    }
    else {
      const fieldNames = [
        ['fastest', 'fastestWait'],
        ['fast', 'fastWait'],
        ['average', 'avgWait'],
        ['safeLow', 'safeLowWait'],
      ]
      dataPoints = fieldNames.map(names => [egsToWei(egsResponse[names[0]]), egsToSeconds(egsResponse[names[1]])]);
    }

    const minPrices = new Map();
    const maxPrices = new Map();
    for (const [price, wait] of dataPoints) {
      minPrices.set(wait, Math.min(price, minPrices.get(wait) || 9999999999 * 1e9));
      maxPrices.set(wait, Math.max(price, maxPrices.get(wait) || 0));
    }

    const times = Array.from(minPrices.keys()).sort((a, b) => (a < b ? -1 : (a == b ? 0 : 1)));

    return {minPrices, maxPrices, times};
  }

  async getGasPrice(maxWait) {
    await this.refreshCache();
    let availableTimes = this.cacheProcessed.times.filter(wait => wait < maxWait);
    if (availableTimes.length == 0) {
      availableTimes = [this.cacheProcessed.times[0]];
    }
    const selectedTime = Math.max(...availableTimes);
    return {
      min: this.cacheProcessed.minPrices.get(selectedTime),
      max: this.cacheProcessed.maxPrices.get(selectedTime),
    }
  }
}

module.exports = { EthGasStation };
