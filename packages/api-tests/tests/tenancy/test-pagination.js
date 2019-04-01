const testenv = require('../../testenv.js');
const partials = require('../../partials.js');

// Shortcuts to most-used facilities.
const { test, inspect } = testenv;

test('Testing "cursor" and "page_size" parameters for lists and their error handling.', async function (t) {
  t.comment('Test getting pages of the user list.');

  const cursors = ['', '-1', '0', '10', 'wrong', 'cD0yMDE5LTAyLTEyKzEzJTNBNDElM0E0NC40MzE2MDklMkIwMCUzQTAw'];
  const pageSizes = ['', '-1', '0', '2', '10', '100', '1000', 'undefined', 'wrong'];
  const searches = ['', '?'].concat(
    cursors.map(x => `?cursor=${x}`),
    pageSizes.map(x => `?page_size=${x}`),
    ...cursors.map(cursor => pageSizes.map(pageSize => `?cursor=${cursor}&page_size=${pageSize}`)),
  );
  // inspect(searches);


  for (const search of searches) {
    t.comment(`Try pagination with ${search}`);
    let response;
    try {
      response = await testenv.tenancy.client.get(`assets/${search}`);
    }
    catch (error) {
      console.log('Caught error while trying to get user list.');
      testenv.inspectError(error)
      continue;
    }
    t.equal(response.status, 200, 'Response status is 200');
    t.ok('next' in response.data, 'Has "next" field');
    t.ok('previous' in response.data, 'Has "previous" field');
    t.ok('results' in response.data, 'Has "results" field');
  }

  t.end();
});
