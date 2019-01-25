/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const axios = require("axios");
const { BASE_URL, API_VERSION, TENANCY_API_KEY } = require("../config");
const { generateTimestamp } = require("../generateTimestamp");
const { generateSignatureHeader } = require("../generateSignatureHeader");
const { generateMessageHeaders } = require("../generateMessageHeaders");

const LIST_USERS_PATH = `/${API_VERSION}/tenancy/users/`;
const RESOURCE_URL = `${BASE_URL}${LIST_USERS_PATH}`;
const REQUEST_METHOD = "GET";

async function listUsers() {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestamp();
  // Assign stringified message body.
  const messageBody = "";
  // Create message parts object to be signed.
  const messageParts = {
    timestamp,
    method: REQUEST_METHOD,
    url: LIST_USERS_PATH,
    queryParams: "",
    body: messageBody
  };
  // Generate signature from the message parts object.
  const signature = generateSignatureHeader(messageParts);
  // Generate the request headers list.
  const headers = generateMessageHeaders({ timestamp, signature });
  // Make configuration for axios.
  const axiosConfig = {
    method: REQUEST_METHOD,
    url: RESOURCE_URL,
    headers
  };

  try {
    // Make the asynchronous request using axios.
    const { data } = await axios(axiosConfig);

    // Return the data.
    return data;

    // Catch an eventual error.
  } catch (error) {
    // Log the error to the console.
    console.error(error.response);
  }
}

exports.listUsers = listUsers;
