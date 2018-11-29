/**
 * Re-format GET params in a repeatable way to allow signing them with HMAC.
 *
 * Query parameters ("GET params") are allowed to appear in any arbitrary order
 * in a URL without changing the meaning of the request. Also, which characters
 * have to be "%"-escaped and which don't is only handled loosely across
 * implementations. All these little inconsistencies are just fine for unsigned
 * GET requests. But to arrive at a repeatable message signature on both ends,
 * query parameters have to be brought into a repeatable shape. One example of
 * doing that is explained here:
 * https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 *
 * This file tries to be a Node.js implementation of that algorithm.
 */

const { toBuf, isObject } = require('./util.js');


const CHAR_A_UPPER = 'A'.codePointAt(0);
const CHAR_Z_UPPER = 'Z'.codePointAt(0);
const CHAR_A_LOWER = 'a'.codePointAt(0);
const CHAR_Z_LOWER = 'z'.codePointAt(0);
const CHAR_0 = '0'.codePointAt(0);
const CHAR_9 = '9'.codePointAt(0);
const CHARS_PUNCTUATION = toBuf('-._~');

function isUnreservedCodePoint(c) {
  return (
    (
      (CHAR_A_UPPER <= c)
      &&
      (c <= CHAR_Z_UPPER)
    )
    ||
    (
      (CHAR_A_LOWER <= c)
      &&
      (c <= CHAR_Z_LOWER)
    )
    ||
    (
      (CHAR_0 <= c)
      &&
      (c <= CHAR_9)
    )
    ||
    CHARS_PUNCTUATION.includes(c)
  )
}

function explicitUriEncode(buf) {
  const chars = [];
  for (const value of buf.values()) {
    if (isUnreservedCodePoint(value)) {
      chars.push(Buffer.from([value]));
    }
    else {
      chars.push(toBuf('%' + value.toString(16)));
    }
  }
  return Buffer.concat(chars);
}

function bufferJoin(joiner, buffers) {
  const parts = [];
  let first = true;
  for (const buf of buffers) {
    if (first) {
      first = false;
    }
    else {
      parts.push(joiner);
    }
    parts.push(buf);
  }
  return Buffer.concat(parts);
}

function isURLSearchParams(thing) {
  return (
    (thing !== undefined)
    &&
    (thing !== null)
    &&
    (thing.constructor === URLSearchParams)
  );
}

function getQueryParamsIterator(queryParams) {
  if (isURLSearchParams(queryParams)) {
    return () => queryParams.entries();
  }
  if (isObject(queryParams)) {
    return function* () {
      for (const name of Object.keys(queryParams)) {
        const value = queryParams[name];
        if (Array.isArray(value)) {
          for (const valueItem of value) {
            yield [name, valueItem];
          }
        }
        else {
          yield [name, value];
        }
      }
    }
  }
}

function canonicalizeQueryParams(queryParams) {
  const equalSign = toBuf('=');
  const ampersAnd = toBuf('&');
  const canonicals = [];

  queryParams = queryParams ? queryParams : {};

  for (const [name, value] of getQueryParamsIterator(queryParams)()) {
    const encodedName = explicitUriEncode(toBuf(name));
    const encodedValue = explicitUriEncode(toBuf(value));
    canonicals.push(Buffer.concat([encodedName, equalSign, encodedValue]));
  }
  canonicals.sort(Buffer.compare);
  return bufferJoin(ampersAnd, canonicals);
}

module.exports = {
  canonicalizeQueryParams,

  // Exported mainly for testing:
  isUnreservedCodePoint, explicitUriEncode, bufferJoin,
  isURLSearchParams, getQueryParamsIterator
};
