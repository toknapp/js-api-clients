const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing users.delete()', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  let isDeleted;
  try {
    isDeleted = await testenv.tenancy.users.delete(username);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Deleting the user failed.');
  }

  t.ok(isDeleted, 'The user was deleted.');

  t.end();
});
