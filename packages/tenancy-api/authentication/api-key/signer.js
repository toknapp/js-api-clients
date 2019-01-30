const crypto = require('crypto');


// This is an Array to preserve the order during signing.
const messagePartsConfig = [
  {
    name: 'timestamp',
    normalize: timestamp => String(timestamp),
  },
  {
    name: 'method',
    normalize: method => method.toUpperCase(),
  },
  {
    name: 'signedPath',
    normalize: input => {
      try {
        // Allow `input` to be an absolute OR relative URL and extract just what we need.

        // @see https://nodejs.org/dist/latest-v10.x/docs/api/url.html#url_constructor_new_url_input_base
        // > In cases where it is not known in advance if `input` is an absolute
        // > URL and a `base` is provided, it is advised to validate that the `origin`
        // > of the `URL` object is what is expected.
        //
        // Here, we provide a `base` for the express purpose of allowing BOTH relative and absolute URLs as `input`.
        // The placeholder information will be disregarded in the info extraction step, anyways.
        const placeholderBaseUrlToAllowRelativeUrls = 'http://placeholder-baseurl.com';

        // @see https://developer.mozilla.org/en-US/docs/Web/API/URL
        // @see https://url.spec.whatwg.org/#api
        const whatwgUrl = new URL(input, placeholderBaseUrlToAllowRelativeUrls);

        // The ASCII graphics at https://nodejs.org/dist/latest-v10.x/docs/api/url.html#url_url_strings_and_url_objects
        // is a good illustration for what we are going for here.
        // For example: "/the/path/beginning/at/root?and=also&the=query&including=question%20mark"
        return whatwgUrl.pathname + whatwgUrl.search;
      }
      catch (err) {
        // Hope that the caller knew what they are doing.
        return input;
      }
    },
  },
  {
    name: 'body',
    normalize: body => body ? body : '',
  },
];


class Signer {
  constructor(secret) {
    this.secret = secret;
  }

  sign(messageParts) {
    let preHashMessage = '';
    for (const { name, normalize } of messagePartsConfig) {
      preHashMessage += normalize(messageParts[name]);
    }
    return crypto.createHmac('sha512', this.secret).update(preHashMessage, 'utf8').digest('hex');
  }

  getDebugInfo(messageParts) {
    const debugInfo = {};
    for (const { name, normalize } of messagePartsConfig) {
      const normalized = normalize(messageParts[name]);
      const sha512 = crypto.createHash('sha512').update(normalized).digest('hex');
      debugInfo[name] = {normalized, sha512};
    }
    return debugInfo;
  }
}

module.exports = {
  Signer
};
