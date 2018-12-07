
function toBuf(str) {
  // TODO Discuss whether or not to use String.normalize('NFC') here
  // @see http://www.unicode.org/reports/tr15/tr15-29.html

  // TODO Implement for browsers with Uint8Array() and TextEncoder() from Encoding Web API
  // @see https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
  return Buffer.from(String(str), 'utf8');
}

function isObject(thing) {
  return (
    (thing !== undefined)
    &&
    (thing !== null)
    &&
    (thing.constructor === Object)
    &&
    ! Array.isArray(thing)
  );
}

module.exports = {
  toBuf, isObject
};
