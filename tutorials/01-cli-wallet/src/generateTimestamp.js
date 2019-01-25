/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

function generateTimestamp() {
  return `${Math.floor(Date.now() / 1000)}`;
}

exports.generateTimestamp = generateTimestamp;