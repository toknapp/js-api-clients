/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const minimist = require("minimist");

const INTERPRETER_AND_FILE_ARGS_LENGTH = 2;
const REGISTER_USER_CMD = "users:register";
const LIST_USERS_CMD = "users";
const USER_WITH_USERNAME_CMD = "user";

module.exports = () => {
  console.log("Welcome to Upvest CLI!");
  const args = minimist(process.argv.slice(INTERPRETER_AND_FILE_ARGS_LENGTH));
  const command = args._[0];

  switch (command) {
    case REGISTER_USER_CMD:
      const { registerUser } = require("./commands/registerUser");
      registerUser(args).then(console.log);
      break;
    case LIST_USERS_CMD:
      const { listUsers } = require("./commands/listUsers");
      listUsers(args).then(console.log);
      break;
    case USER_WITH_USERNAME_CMD:
      const { userWithUsername } = require("./commands/userWithUsername");
      userWithUsername({ username: args._[1] }).then(console.log);
      break;
    default:
      console.error(`"${command}" is not a valid command!`);
      break;
  }
};
