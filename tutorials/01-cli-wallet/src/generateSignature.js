/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const crypto = require("crypto");
const {
  TENANCY_API_KEY: { secret }
} = require("./config");

const ALGORITHM = "sha512";
const ENCODING = "hex";

function generateSignature(message) {
  const hmac = crypto.createHmac(ALGORITHM, secret);
  hmac.update(message);

  return hmac.digest(ENCODING);
}

exports.generateSignature = generateSignature;
