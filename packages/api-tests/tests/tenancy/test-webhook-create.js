const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;


test('Testing dynamic webhook for "echo.get"', async function (t) {
  t.comment('Create webhook.');

  await partials.tVerifyDynamicWebhookBaseUrl(t, testenv.tenancy, testenv.config.webhook.dynamicBaseUrl);

  const shout = 'Hello Echo!';

  const eventFilters = ['upvest.echo.get'];
  const { webhook, matcherWrapper } = await partials.tCreateDynamicWebhookWithMatcher(t, testenv.tenancy, eventFilters);
  const echoGetWebhookMatcher = matcherWrapper((t, webhookPayload) => {
    t.comment('inspect webhookPayload');
    inspect(webhookPayload);

    t.equal(webhookPayload.action, 'echo.get', `Webhook payload has expected action value.`);
    t.equal(webhookPayload.data.echo, shout, `Webhook payload has expected echo value.`);

    return true;
  });

  const webhookRecording = await testenv.getWebhookRecording();
  webhookRecording.addMatcher(echoGetWebhookMatcher);
  
  let echoGet;
  try {
    echoGet = await testenv.tenancy.echoGet(shout);
  }
  catch (error) {
    return partials.tErrorFail(t, error, 'Failed to call echo endpoint. (Or, if this was run via OAuth2, it might also mean that obtaining the OAuth2 token failed.)');
  }
  t.equal(echoGet, shout, `Actual and expected echo are equal (GET "${shout}")`);
  
  try {
    t.comment('Waiting for all expected webhooks to be called.')
    const areAllExpectedWebhooksCalled = await webhookRecording.areAllMatched(3 * 60 * 1000);
    t.ok(areAllExpectedWebhooksCalled, 'All expected webhooks were called');
  }
  catch (err) {
    inspect(err);
    t.fail('Timed out while waiting for all expected webhooks to be called');
  }
  
  webhookRecording.stop();

  t.end();
});
