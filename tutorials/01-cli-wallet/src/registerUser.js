/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

import { TENANCY_API_KEY, BASE_URL } from "./config";

export async function registerUser({ username, passphrase }) {
  // Assign the resource URL to register a new user.
  const resourceUrl = `${BASE_URL}/tenancy/users/`;
  // Assign request method for the API call.
  const requestMethod = "POST";
  // Assign new timestamp to make the API call.
  const timestamp = generateApiTimestamp();
  // Create message parts object to be signed.
  const messageParts = {
    timestamp,
    method: requestMethod,
    url: resourceUrl,
    queryParams,
    body
  };
  // Assign signature from message parts object.
  const signature = generateApiSignature(messageParts);
  // Create the request headers list.
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-UP-API-Key": TENANCY_API_KEY.key,
    "X-UP-API-Passphrase": TENANCY_API_KEY.passphrase,
    "X-UP-API-Timestamp": timestamp,
    "X-UP-API-Signature": signature
  });
  // Construct options object to apply to the API request.
  const requestSettings = {
    method: requestMethod,
    headers
  };

  const response = await fetch(resourceUrl, requestSettings);
}

export function generateApiTimestamp() {
  return `${Math.floor(Date.now() / 1000)}`;
}

export function generateApiSignature(messageParts) {
  const algorithm = "sha512";
  const hmac = crypto.createHmac(algorithm, TENANCY_API_KEY.secret);
}
