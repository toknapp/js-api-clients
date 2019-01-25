/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const axios = require("axios");
const { BASE_URL, API_VERSION } = require("../config");
const { generateTimestampHeader } = require("../generateTimestampHeader");
const { generateSignatureHeader } = require("../generateSignatureHeader");
const { generateHeaders } = require("../generateHeaders");

const USER_INFO_PATH = `/${API_VERSION}/tenancy/users/`;
const REQUEST_METHOD = "DELETE";

async function deregisterUserWithUsername({ username }) {
  // Assign new timestamp to make the API call.
  const timestamp = generateTimestampHeader();
  // Add username parameter to path.
  const deregisterUserWithUsernamePath = `${USER_INFO_PATH}${username}`;
  // Assign stringified message body.
  const messageBody = "";
  // Create message parts object to be signed.
  const messageParts = {
    timestamp,
    method: REQUEST_METHOD,
    url: deregisterUserWithUsernamePath,
    queryParams: "",
    body: messageBody
  };
  // Generate signature from the message parts object.
  const signature = generateSignatureHeader(messageParts);
  // Generate the request headers list.
  const headers = generateHeaders({ timestamp, signature });
  // Assemble resource URL to make the API call.
  const resourceUrl = `${BASE_URL}${deregisterUserWithUsernamePath}`;
  // Make configuration for axios.
  const axiosConfig = {
    method: REQUEST_METHOD,
    url: resourceUrl,
    headers
  };

  try {
    // Make the asynchronous request using axios.
    const { status, statusText } = await axios(axiosConfig);

    // Return the status and status text.
    return { status, statusText };

    // Catch an eventual error.
  } catch (error) {
    // Log the error to the console.
    console.error(error.response);
  }
}

exports.deregisterUserWithUsername = deregisterUserWithUsername;
