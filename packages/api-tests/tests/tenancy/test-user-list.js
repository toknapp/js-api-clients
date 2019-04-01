const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing users.list()', async function (t) {
  const PAGE_LENGTH = 2;
  const NUMBER_OF_USERS = (3 * PAGE_LENGTH);
  const usernames = new Set();

  for await (const user of testenv.tenancy.users.list()) {
    usernames.add(user.username);
  }

  const numberOfUsersToCreate = NUMBER_OF_USERS - usernames.size;
  const userPromises = [];
  for (let i = 0; i < numberOfUsersToCreate; i++) {
    userPromises.push(partials.tCreateUser(t, testenv.tenancy));
  }
  const userResults = await Promise.all(userPromises);
  for (const { username, password } of userResults) {
    if (username === null) return;
    usernames.add(username);
  }

  t.comment('Test listing all users and retrieving each one of them.')
  for await (const user of testenv.tenancy.users.list(PAGE_LENGTH)) {
    let retrievedUser;
    try {
      retrievedUser = await testenv.tenancy.users.retrieve(user.username);
    }
    catch (error) {
      return partials.tErrorFail(t, error, 'Retrieving the user failed.');
    }
    t.ok(usernames.has(retrievedUser.username), 'Retrieved user is "known" in our list of existing or created test users.');
  }

  // TODO Figure out a way of changing the underlying list without deleting
  // users which have been used for Tx testing and therefore have potentially
  // stuck funds to recover.

  // t.comment('Test listing all users and deleting each one of them, thereby changing the underlying list.')
  // for await (const user of testenv.tenancy.users.list()) {
  //   let isDeleted;
  //   try {
  //     isDeleted = await testenv.tenancy.users.delete(user.username);
  //   }
  //   catch (error) {
  //     return partials.tErrorFail(t, error, 'Deleting the user failed.');
  //   }
  //   t.ok(isDeleted, 'Deleted user successfully.');
  //   t.ok(usernames.delete(user.username), 'Deleted user was "known" in our list of created test users.');
  // }
  // t.equal(usernames.size, 0, 'No left-overs, all users of our list of created users were successfully deleted.');

  t.end();
});
