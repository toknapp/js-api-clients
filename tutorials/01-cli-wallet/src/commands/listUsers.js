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

const LIST_USERS_PATH = `/${API_VERSION}/tenancy/users/`;
const RESOURCE_URL = `${BASE_URL}${LIST_USERS_PATH}`;
const REQUEST_METHOD = "GET";

async function listUsers() {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestamp();
  // Assign stringified message body.
  const messageBody = "";
  // Assemble message parts object to be signed.
  const messageParts = {
    timestamp,
    method: REQUEST_METHOD,
    url: LIST_USERS_PATH,
    queryParams: "",
    body: messageBody
  };
  // Generate signature from the message parts object.
  const signature = generateSignature(messageParts);
  // Generate the request headers list.
  const headers = generateMessageHeaders({ timestamp, signature });
  // Assemble configuration for axios.
  const axiosConfig = {
    method: REQUEST_METHOD,
    url: RESOURCE_URL,
    headers
  };

  // Asynchronously return call to the API.
  return await axiosAdapter(axiosConfig);
}

exports.listUsers = listUsers;
