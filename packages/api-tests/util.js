const { promisify } = require('util');
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

const inspect = thing => console.dir(thing, {depth:null, colors:true});

const inspectError = error => {
  if (error.response) {
    const isTextResponse = ('string' == typeof error.response.data);
    const summary = {
      request: {
        method: error.response.config.method,
        url: error.response.config.url,
        queryParams: error.response.config.params,
        headers: error.response.config.headers,
        jsonBody: error.response.config.data,
      },
      response: {
        status: error.response.status,
        reason: error.response.statusText,
        headers: error.response.headers,
        jsonBody: isTextResponse ? '[see printed response text below]' : error.response.data,
      },
    }
    inspect(summary);
    if (isTextResponse) {
      console.log(error.response.data);
    }
  }
  else {
    inspect(error);
  }
}

const tErrorFail = (t, error, message) => {
  inspectError(error);
  t.fail(message)
  t.end();
  return;
}

const readlineQuestionPromise = promisify((prompt, callback) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(
    prompt,
    answer => {
      rl.close();
      callback(undefined, answer);
    }
  );
});

module.exports = {
  setDifference, setEqual, inspect, inspectError, tErrorFail, readlineQuestionPromise
};
