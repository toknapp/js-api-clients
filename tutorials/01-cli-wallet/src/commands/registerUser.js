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

const ADD_USER_PATH = `/${API_VERSION}/tenancy/users/`;
const RESOURCE_URL = `${BASE_URL}${ADD_USER_PATH}`;
const REQUEST_METHOD = "POST";

async function registerUser({ username, password }) {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestamp();
  // Assign payload body with username and password.
  const payloadBody = { username, password };
  // Write payload body as string.
  const messageBody = JSON.stringify(payloadBody);
  // Create message parts object to be signed.
  const messageParts = {
    timestamp,
    method: REQUEST_METHOD,
    path: ADD_USER_PATH,
    queryParams: "",
    body: messageBody
  };
  // Assign signature from message parts object.
  const signature = generateSignature(messageParts);
  // Generate the request headers list.
  const headers = generateMessageHeaders({ timestamp, signature });
  // Make configuration for axios.
  const axiosConfig = {
    method: REQUEST_METHOD,
    url: RESOURCE_URL,
    headers,
    data: payloadBody
  };

  // Asynchronously return call to the API.
  return await axiosAdapter(axiosConfig);
}

exports.registerUser = registerUser;
