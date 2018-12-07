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
    inspect(error.response.config.method);
    inspect(error.response.config.url);
    inspect(error.response.config.params);
    inspect(error.response.config.headers);
    inspect(error.response.config.data);
    inspect(error.response.status);
    inspect(error.response.statusText);
    inspect(error.response.headers);
    inspect(error.response.data);
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
