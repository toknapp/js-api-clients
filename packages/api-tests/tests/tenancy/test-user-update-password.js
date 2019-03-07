const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing users.updatePassword()', async function (t) {
  let echoSuccess;
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  t.comment('See if OAuth2 with original password works.');
  echoSuccess = await partials.tEcho(t, testenv.getClienteleAPI(username, password));
  if (! echoSuccess) return;

  await partials.tWaitForWalletActivation(t, testenv.getClienteleAPI(username, password));

  const newPassword = testenv.cryptoRandomString(10);

  let isUpdated;
  try {
    isUpdated = await testenv.tenancy.users.updatePassword(username, password, newPassword);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Updating the password failed.');
  }
  t.ok(isUpdated, 'The user password was updated.');

  try {
    echo = await testenv.getClienteleAPI(username, password).echo('all good');
    t.fail('OAuth2 with original password should have failed, but did not.');
  }
  catch (error) {
    t.equal(error.response.status, 401, 'OAuth2 with original password fails with status 401.');
    t.equal(error.response.data.error, 'invalid_grant', 'OAuth2 with original password fails with error code "invalid_grant".');
  }

  t.comment('See if OAuth2 with new password works.');
  echoSuccess = await partials.tEcho(t, testenv.getClienteleAPI(username, newPassword));
  if (! echoSuccess) return;

  t.end();
});
