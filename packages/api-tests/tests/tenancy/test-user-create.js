const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing users.create()', async function (t) {
  const user = await partials.tCreateUser(t, testenv.tenancy);
  if (! user.username) return;

  await partials.tIsRecoveryKitValid(t, user.recoverykit);

  t.notOk(user.wallet_ids, 'No wallet IDs for newly created user because no asset IDs requested.');

  t.end();
});
