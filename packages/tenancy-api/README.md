# Client library for the Upvest Tenancy API

This API encompasses operations for managing users within your tenancy.

A tenancy is your "area" of Upvest, where you will be registering your users before authenticating them with OAuth2. When registering a user, you will be provided with a recovery kit to forward on to the user.

This API client is based on [axios](https://www.npmjs.com/package/axios).

Here is an example how to use it in Node.js:

```javascript
const { UpvestTenancyAPI } = require('@upvest/tenancy-api');

const config = {
  "baseURL": "https://api-playground.eu.upvest.co/1.0/",
  "apikey": {
    "key": "tPKWL9B_yTgfSToOFJmLyg",
    "secret": "9O7tLb1ub6qLHZQ00ButDOcfvw9g7Gn8GzFB4WmsUrA",
    "passphrase": "dlKsARh6U3chEQK0WBTU-u-qqn-l4IknmXH1jRGW_fQ"
  },
  "oauth2": {
    "client_id": "j3sH4R1htxgTkdWPxRgyTQt2LSiovrKuziHAc8aJ",
    "client_secret": "6hYU72rsW3VTl94hBqokzYZSuh5jaKLwjTYLouEhl7ndurkqn78lFYzeteU6kCHLzfZblT5WTf4p7R4VS9lR7vHne0Xm09DBolCG693Cp5qlwL7CHnUDAovjYPWxKP3z"
  }
}

const tenancy = new UpvestTenancyAPI(
  config.baseURL,
  config.apikey.key,
  config.apikey.secret,
  config.apikey.passphrase
);

async function example() {
  const username = 'Example User';
  const password = 'ex@mp1e p@55w0rd';

  let exampleUser;
  try {
    exampleUser = await tenancy.users.create(username, password);
  }
  catch (error) {
    // Handle error
  }

  console.log(exampleUser.username);

  for await (const user of tenancy.users.list()) {
    console.log(user.username);
  }
}

example();

```

For more examples, please check out our test-suite at https://www.npmjs.com/package/@upvest/api-tests

# License

This software is released under the [MIT License](https://github.com/toknapp/js-api-clients/tree/master/LICENSE)
