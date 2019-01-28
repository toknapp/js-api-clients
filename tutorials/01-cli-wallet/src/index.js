/*!
 * Copyright © 2018-present Upvest GmbH. All rights reserved.
 *
 * License is found in the LICENSE file in the root directory of this source tree.
 */

const minimist = require("minimist");

const INTERPRETER_AND_FILE_ARGS_LENGTH = 2;

const ECHO_MESSAGE_CMD = "echo";
const REGISTER_USER_CMD = "user:register";
const LIST_USERS_CMD = "users";
const USER_WITH_USERNAME_CMD = "user";
const DEREGISTER_USER_WITH_USERNAME_CMD = "user:deregister";

module.exports = () => {
  console.log("Welcome to Upvest CLI!");
  const args = minimist(process.argv.slice(INTERPRETER_AND_FILE_ARGS_LENGTH));
  const command = args._[0];

  switch (command) {
    case ECHO_MESSAGE_CMD:
      const { echoMessageUsingGet } = require("./commands/echoMessageUsingGet");
      echoMessageUsingGet(args._[1]).then(console.log);
      break;
    case REGISTER_USER_CMD:
      const { registerUser } = require("./commands/registerUser");
      registerUser(args).then(console.log);
      break;
    case LIST_USERS_CMD:
      const { listUsers } = require("./commands/listUsers");
      listUsers().then(console.log);
      break;
    case USER_WITH_USERNAME_CMD:
      const { userWithUsername } = require("./commands/userWithUsername");
      userWithUsername({ username: args._[1] }).then(console.log);
      break;
    case DEREGISTER_USER_WITH_USERNAME_CMD:
      const {
        deregisterUserWithUsername
      } = require("./commands/deregisterUserWithUsername");
      deregisterUserWithUsername({ username: args._[1] }).then(console.log);
      break;
    default:
      console.error(`"${command}" is not a valid command!`);
      break;
  }
};
