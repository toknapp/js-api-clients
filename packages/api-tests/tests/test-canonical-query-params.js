const test = require('tape');

const {
  canonicalizeQueryParams,
  isUnreservedCodePoint, explicitUriEncode, bufferJoin, isObject,
  isURLSearchParams, getQueryParamsIterator
} = require('@upvest/tenancy-api/authentication/api-key/canonical-query-parameters.js');

const { toBuf } = require('@upvest/tenancy-api/authentication/api-key/util.js');

const { setDifference, setEqual } = require('./util.js');

test('Testing getQueryParamsIterator() with plain Object', t => {
  const queryParams = {
    a: 'b',
    c: 'd',
    e: ['x', 'y']
  }
  const expected = new Set(['a=b', 'c=d', 'e=x', 'e=y'])

  const actual = new Set()
  for (const [name, value] of getQueryParamsIterator(queryParams)()) {
    actual.add(`${name}=${value}`)
  }

  t.ok(setEqual(actual, expected), 'actual and expected sets are set-equal');
  t.equal(actual.size, expected.size, 'actual and expected set sizes are equal');
  t.end();
});

test('Testing getQueryParamsIterator() with URLSearchParams', t => {
  const queryParams = new URLSearchParams('e=y&a=b&e=x&c=d');
  const expected = new Set(['a=b', 'c=d', 'e=x', 'e=y'])

  const actual = new Set()
  for (const [name, value] of getQueryParamsIterator(queryParams)()) {
    actual.add(`${name}=${value}`)
  }

  t.ok(setEqual(actual, expected), 'actual and expected sets are set-equal');
  t.equal(actual.size, expected.size, 'actual and expected set sizes are equal');
  t.end();
});


test('Testing canonicalizeQueryParams() with plain Object', t => {
  const queryParams = {
    a: 'b ',
    'c ': 'd',
    e: ['x~', 'y']
  }
  const expected = toBuf('a=b%20&c%20=d&e=x~&e=y');

  const actual = canonicalizeQueryParams(queryParams);

  if (0 !== Buffer.compare(actual, expected)) {
    t.comment(`actual == ${actual.toString('utf8')}`);
    t.comment(`expected == ${expected.toString('utf8')}`);
  }
  t.equal(Buffer.compare(actual, expected), 0, 'actual and expected Buffers are equal');
  t.end();
});



test('Testing canonicalizeQueryParams() with URLSearchParams', t => {
  const queryParams = new URLSearchParams('e=y&a=b&e=x&c=d');
  const expected = toBuf('a=b&c=d&e=x&e=y');

  const actual = canonicalizeQueryParams(queryParams);

  if (0 !== Buffer.compare(actual, expected)) {
    t.comment(`actual == ${actual.toString('utf8')}`);
    t.comment(`expected == ${expected.toString('utf8')}`);
  }
  t.equal(Buffer.compare(actual, expected), 0, 'actual and expected Buffers are equal');
  t.end();
});
