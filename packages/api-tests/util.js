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
  else if (error.errno || error.code) {
    const summary = {
      errno: error.errno,
      code: error.code,
      syscall: error.syscall,
    };
    if (error.config) {
      summary['request'] = {
        timeout: error.config.timeout,
        method: error.config.method,
        url: error.config.url,
        queryParams: error.config.params,
        headers: error.config.headers,
        jsonBody: error.config.data,
      };
    }
    inspect(summary);
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

// see https://gist.github.com/taniarascia/7ff2e83577d83b85a421ab36ab2ced84
function hexdump(buf) {
  let lines = []

  for (let i = 0; i < buf.length; i += 16) {
    let address = i.toString(16).padStart(8, '0') // address
    let block = buf.slice(i, i + 16) // cut buffer into blocks of 16
    let hexArray = []
    let asciiArray = []
    let padding = ''

    for (let value of block) {
      hexArray.push(value.toString(16).padStart(2, '0'))
      asciiArray.push(value >= 0x20 && value < 0x7f ? String.fromCharCode(value) : '.')
    }

    // if block is less than 16 bytes, calculate remaining space
    if (hexArray.length < 16) {
      let space = 16 - hexArray.length
      padding = ' '.repeat(space * 2 + space + (hexArray.length < 9 ? 1 : 0)) // calculate extra space if 8 or less
    }

    let hexString =
      hexArray.length > 8
        ? hexArray.slice(0, 8).join(' ') + '  ' + hexArray.slice(8).join(' ')
        : hexArray.join(' ')

    let asciiString = asciiArray.join('')
    let line = `${address}  ${hexString}  ${padding}|${asciiString}|`

    lines.push(line)
  }

  return lines.join('\n')
}

function removeHexPrefix(hexString) {
  return (hexString.startsWith('0x') || hexString.startsWith('0X')) ? hexString.substring(2) : hexString;
}


module.exports = {
  setDifference, setEqual, inspect, inspectResponse, inspectError,
  readlineQuestionPromise,
  getBalanceForAssetId,
  hexdump, removeHexPrefix,
};
