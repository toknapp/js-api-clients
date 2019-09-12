# Client library for the Upvest Clientele API

This API encompasses operations on behalf of your users, which are things like creating blockchain transactions (yet to be implemented) and inspecting wallet balances, etc.

This API client is based on [axios](https://www.npmjs.com/package/axios).

Here is an example how to use it in Node.js:

```javascript
const { UpvestClienteleAPI } = require('@upvest/clientele-api');

const exampleUsername = 'Example User';
const examplePassword = 'ex@mp1e p@55w0rd';

const config = {
  "baseURL": "https://api-playground.eu.upvest.co/1.0/",
  "oauth2": {
    "client_id": "j3sH4R1htxgTkdWPxRgyTQt2LSiovrKuziHAc8aJ",
    "client_secret": "6hYU72rsW3VTl94hBqokzYZSuh5jaKLwjTYLouEhl7ndurkqn78lFYzeteU6kCHLzfZblT5WTf4p7R4VS9lR7vHne0Xm09DBolCG693Cp5qlwL7CHnUDAovjYPWxKP3z"
  }
}

const clientele = new UpvestClienteleAPI(
  config.baseURL,
  config.oauth2.client_id,
  config.oauth2.client_secret,
  exampleUsername,
  examplePassword
);

async function example() {
  for await (const wallet of clientele.wallets.list()) {
    console.log(wallet);
  }
}

example();

```

For more examples, please check out our test-suite at https://www.npmjs.com/package/@upvest/api-tests

# License

This software is released under the [MIT License](https://github.com/toknapp/js-api-clients/tree/master/LICENSE)
