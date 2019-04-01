const { createInterface } = require('readline');

function setDifference(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

function setEqual(setA, setB) {
  return (
    (setDifference(setA, setB).size == 0)
    &&
    (setDifference(setB, setA).size == 0)
  );
}

const inspect = (...things) => things.forEach(thing => console.dir(thing, {depth:null, colors:true}));

const inspectResponse = response => {
  const isTextResponse = ('string' == typeof response.data);
  const summary = {
    request: {
      method: response.config.method,
      url: response.config.url,
      queryParams: response.config.params,
      headers: response.config.headers,
      jsonBody: response.config.data,
    },
    response: {
      status: response.status,
      reason: response.statusText,
      headers: response.headers,
      jsonBody: isTextResponse ? '[see printed response text below]' : response.data,
    },
  }
  inspect(summary);
  if (isTextResponse) {
    console.log(response.data);
  }
};

const inspectError = error => {
  if (error.response) {
    inspectResponse(error.response);
  }
  else {
    inspect(error);
  }
};

function readlineQuestionPromise(prompt) {
  return new Promise(function promiseExecutor(resolvePromise, rejectPromise) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(
      prompt,
      answer => {
        rl.close();
        resolvePromise(answer);
      }
    );
  });
}


function getBalanceForAssetId(wallet, assetId) {
  let balance = null;
  if (Array.isArray(wallet.balances)) {
    wallet.balances.forEach(function callback(loopBalance, index) {
      if (loopBalance.asset_id == assetId) {
        balance = loopBalance;
      }
    });
  }
  return balance;
}

module.exports = {
  setDifference, setEqual, inspect, inspectResponse, inspectError,
  readlineQuestionPromise,
  getBalanceForAssetId
};
