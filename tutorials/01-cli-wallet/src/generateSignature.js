/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const crypto = require("crypto");
const {
  TENANCY_API_KEY: { secret }
} = require("./config");

const normalizationForMessageParts = {
  timestamp: timestamp => bufferFrom(timestamp),
  method: method => bufferFrom(method),
  path: path => bufferFrom(path),
  queryParams: queryParams => normalizeQueryParams(queryParams),
  body: body => bufferFrom(body)
};

function bufferFrom(string) {
  const encoding = "utf-8";

  return Buffer.from(string, encoding);
}

function normalizeQueryParams(queryParams) {
  return queryParams;
}

function generateSignature(messageParts) {
  const algorithm = "sha512";
  const hmac = crypto.createHmac(algorithm, secret);

  const messageKeys = Object.keys(messageParts);
  for (const key of messageKeys) {
    hmac.update(normalizationForMessageParts[key](messageParts[key]));
  }

  const encoding = "hex";

  return hmac.digest(encoding);
}

exports.generateSignature = generateSignature;
