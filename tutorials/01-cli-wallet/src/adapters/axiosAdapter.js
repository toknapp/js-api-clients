/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const axios = require("axios");

async function axiosAdapter(config) {
  try {
    // Make the asynchronous request using axios.
    const { data } = await axios(config);

    // Return the data.
    return data;

    // Catch an eventual error.
  } catch (error) {
    // Log the error to the console.
    console.error(error.response);
  }
}

exports.axiosAdapter = axiosAdapter;
