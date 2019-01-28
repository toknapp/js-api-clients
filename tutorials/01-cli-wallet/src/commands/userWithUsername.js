/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const { BASE_URL, API_VERSION } = require("../config");
const { generateTimestamp } = require("../generateTimestamp");
const { generateSignature } = require("../generateSignature");
const { generateMessageHeaders } = require("../generateMessageHeaders");
const { axiosAdapter } = require("../adapters/axiosAdapter");

const USER_INFO_PATH = `/${API_VERSION}/tenancy/users/`;
const REQUEST_METHOD = "GET";

async function userWithUsername({ username }) {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestamp();
  // Add username parameter to path.
  const userWithUsernamePath = `${USER_INFO_PATH}${username}`;
  // Assign stringified message body.
  const messageBody = "";
  // Create message parts object to be signed.
  const messageParts = {
    timestamp,
    method: REQUEST_METHOD,
    path: userWithUsernamePath,
    queryParams: "",
    body: messageBody
  };
  // Generate signature from the message parts object.
  const signature = generateSignature(messageParts);
  // Generate the request headers list.
  const headers = generateMessageHeaders({ timestamp, signature });
  // Assemble resource URL to make the API call.
  const resourceUrl = `${BASE_URL}${userWithUsernamePath}`;
  // Make configuration for axios.
  const axiosConfig = {
    method: REQUEST_METHOD,
    url: resourceUrl,
    headers
  };

  // Asynchronously return call to the API.
  return await axiosAdapter(axiosConfig);
}

exports.userWithUsername = userWithUsername;
