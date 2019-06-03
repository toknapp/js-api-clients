
async function canRun(env) {
  return true;
}

async function test(env) {
  // Shortcuts to most-used facilities.
  const { t, inspect, testenv, partials } = env;

  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;
  const clientele = testenv.getClienteleAPI(username, password);
  const echoSuccess = await partials.tEcho(t, clientele);
  if (! echoSuccess) return;
  t.end();
}

module.exports = {
  title: 'Testing that valid OAuth2 credentials succeed + Testing OAuth2 echo endpoint',
  canRun: canRun,
  test: test
}
