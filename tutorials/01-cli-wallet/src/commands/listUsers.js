/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const axios = require("axios");
const { BASE_URL, API_VERSION, TENANCY_API_KEY } = require("../config");
const { generateTimestampHeader } = require("../generateTimestampHeader");
const { generateSignatureHeader } = require("../generateSignatureHeader");

const LIST_USERS_PATH = `/${API_VERSION}/tenancy/users/`;
const RESOURCE_URL = `${BASE_URL}${LIST_USERS_PATH}`;
const REQUEST_METHOD = "GET";

async function listUsers() {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestampHeader();
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
  // Assign signature from message parts object.
  const signature = generateSignatureHeader(messageParts);
  // Create the request headers list.
  const headers = {
    "Content-Type": "application/json",
    "X-UP-API-Key": TENANCY_API_KEY.key,
    "X-UP-API-Passphrase": TENANCY_API_KEY.passphrase,
    "X-UP-API-Timestamp": timestamp,
    "X-UP-API-Signature": signature
  };
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
