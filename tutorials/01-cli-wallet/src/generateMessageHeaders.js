/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const { TENANCY_API_KEY } = require("./config");

function generateMessageHeaders({ timestamp, signature }) {
  // Create the message headers list.
  const headers = {
    "Content-Type": "application/json",
    "X-UP-API-Key": TENANCY_API_KEY.key,
    "X-UP-API-Passphrase": TENANCY_API_KEY.passphrase,
    "X-UP-API-Timestamp": timestamp,
    "X-UP-API-Signature": signature
  };

  // Return the message headers list.
  return headers;
}

// Expose the `generateMessageHeaders` function.
exports.generateMessageHeaders = generateMessageHeaders;
