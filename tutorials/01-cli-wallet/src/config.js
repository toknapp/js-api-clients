/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const BASE_URL = "https://api-playground.eu.upvest.co";

const API_VERSION = "1.0";

/* The tenancy API key.
 * The default provided details will use the Upvest playground, which accesses
 * protocol testnets. Replace with your own tenancy API key details.
 */
const TENANCY_API_KEY = {
  key: "ItPd0Zp6LuoWtF8gwQbr-g",
  secret: "XFWYYrCpeP3RkWzK5_yDL18JH3paE6WBQ6Qe4UJWG80",
  passphrase: "eomvRYUV1SGyoyk4GeOBA5dCx-9cznqyGR6rwowagqI"
};

exports.BASE_URL = BASE_URL;
exports.API_VERSION = API_VERSION;
exports.TENANCY_API_KEY = TENANCY_API_KEY;
