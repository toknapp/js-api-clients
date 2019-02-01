/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const {
  TENANCY_API_KEY: { key, passphrase }
} = require("./config");

function generateMessageHeaders({ timestamp, signature, path }) {
  // Create the message headers list.
  const headers = {
    "Content-Type": "application/json",
    "X-UP-API-Key": key,
    "X-UP-API-Passphrase": passphrase,
    "X-UP-API-Timestamp": timestamp,
    "X-UP-API-Signature": signature,
    "X-UP-API-Signed-Path": path
  };

  // Return the message headers list.
  return headers;
}

// Expose the `generateMessageHeaders` function.
exports.generateMessageHeaders = generateMessageHeaders;
