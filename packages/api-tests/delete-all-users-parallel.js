const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const { UpvestTenancyAPI } = require('@upvest/tenancy-api');
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const {
  inspect, inspectError, tEcho, tCreateWallets, readlineQuestionPromise,
} = require('./util.js');

const { test_config, forced } = require('./cli-options.js');

const tenancy = new UpvestTenancyAPI(
  test_config.baseURL,
  test_config.first_apikey.key,
  test_config.first_apikey.secret,
  test_config.first_apikey.passphrase_last_chance_to_see,
);

async function deleteAllUsers() {
  if (! forced) {
    inspect('Please use the --force command line switch to delete all users.');
    return;
  }

  const promises = [];
  const results = [];
  const errors = [];

  for await (const user of tenancy.users.list(100)) {
    if (user.username.startsWith('txtest-')) {
      // Skip users for whom funds might have gotten stuck in a failed transaction
      continue;
    }
    const deletePromise = tenancy.users.delete(user.username).then(result => results.push(result)).catch(error => errors.push(error));
    promises.push(deletePromise);
  }

  inspect('Number of users to be deleted.');
  inspect(promises.length);

  inspect('Waiting for all deletion requests to finish.');
  await Promise.allSettled(promises);

  inspect('##################################################################');
  inspect('# Results:');
  inspect('##################################################################');
  inspect(...results);

  inspect('##################################################################');
  inspect('# Errors:');
  inspect('##################################################################');
  inspect(...errors);
}

deleteAllUsers();

