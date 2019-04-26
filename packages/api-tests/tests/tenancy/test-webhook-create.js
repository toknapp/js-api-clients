const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test.skip('Testing webhook.create()', async function (t) {
  t.comment('Create webhook.')

  const url = 'https://upvest-raphael-flexapp.appspot.com/webhook/platitude--raphael-local-generic--tenant-1';
  const headers = {"X-Test": "Hello world!"};
  const version = '1.2';
  const status = 'ACTIVE';
  const eventFilters = [
    'wallet.created',
    '*',
    'wallet.*',
  ];
  const hmacSecretKey = 'abcdef';

  let webhook;
  try {
    webhook = await testenv.tenancy.webhooks.create(url, headers, version, status, eventFilters, hmacSecretKey);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Creating the webhook failed.');
  }

  t.end();
});
