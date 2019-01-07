const { createInterface } = require('readline');

const cryptoRandomString = require('crypto-random-string');

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
};

const tErrorFail = (t, error, message) => {
  inspectError(error);
  t.fail(message);
  t.end();
  return false;
};

const tCreateUser = async (t, tenancy) => {
  const username = cryptoRandomString(10);
  const password = cryptoRandomString(10);
  let user;
  try {
    user = await tenancy.users.create(username, password);
  }
  catch (error) {
    tErrorFail(t, error, 'Creating the user failed.');
    return { username:null, password:null, recoverykit:null };
  }

  t.equal(user.username, username, 'Actual and expected username are equal');

  user.password = password;
  return user;
};

const tEcho = async (t, api) => {
  const ECHO = 'Hi there!';
  let result;

  try {
    result = await api.echo(ECHO);
  }
  catch (error) {
    return tErrorFail(t, error, 'Either obtaining the OAuth2 token or calling the echo endpoint failed.');
  }

  t.equal(result, ECHO, 'Actual and expected OAuth2 echo are equal');
  return true;
};

const tWaitForWalletActivation = async (t, api) => {
  t.comment('Wait for wallet activation.')
  // Poll user's wallets to see when seed generation has finished. Prefer
  // polling over the API Key callback, because this test script might run in
  // places which are not able to receive callbacks.
  const MAX_WAIT = 3 * 60;
  let isGenSeedFinished;
  let secondsWaitedForGenSeed = 0;
  do {
    isGenSeedFinished = true;
    for await (const wallet of api.wallets.list()) {
      t.comment(`Waited ${secondsWaitedForGenSeed} seconds.`);
      // inspect(wallet);
      if (wallet.status != 'ACTIVE' || wallet.address === null) {
        isGenSeedFinished = false;
        break;
      }
    }
    if (! isGenSeedFinished) {
      // Sleep for a second, then try again.
      await setTimeoutPromise(1000);
    }
    secondsWaitedForGenSeed++;
  }
  while (! isGenSeedFinished && secondsWaitedForGenSeed < MAX_WAIT);
  t.ok(secondsWaitedForGenSeed < MAX_WAIT, `Waited less than ${MAX_WAIT} seconds for seed generation.`);

  const GRACE_PERIOD = 10;
  t.comment(`Waiting for an additional grace period of ${GRACE_PERIOD} seconds.`)
  await setTimeoutPromise(GRACE_PERIOD * 1000);
};

const tListAndRetrieveWallets = async (t, api) => {
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


module.exports = {
  setDifference, setEqual, inspect, inspectError,
  tErrorFail, tCreateUser, tEcho, tWaitForWalletActivation,
  readlineQuestionPromise
};
