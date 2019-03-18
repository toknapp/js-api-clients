const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing OAuth2 token re-use', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;
  const clientele = testenv.getClienteleAPI(username, password);
  t.comment('Test echo with "normal" Clientele API wrapper');
  const echoSuccess = await partials.tEcho(t, clientele);
  if (! echoSuccess) return;

  t.comment('Test echo with a Clientele API wrapper which allows to re-use an OAuth2 token');
  const oauth2Token = await clientele.getCachedToken();

  tokenClientele = new testenv.UpvestClienteleAPIFromOAuth2Token(
    testenv.config.baseURL,
    oauth2Token
  );

  const tokenEchoSuccess = await partials.tEcho(t, tokenClientele);
  if (! tokenEchoSuccess) return;

  t.end();
});
