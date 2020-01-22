# Client library for the Upvest Clientele API

This API encompasses operations on behalf of your users, which are things like creating blockchain transactions (yet to be implemented) and inspecting wallet balances, etc.

This API client is based on [axios](https://www.npmjs.com/package/axios).

Features

- Get user wallets list
- Create new wallet
- Send transaction

### OAuth Authentication

The authentication via OAuth allows you to perform operations on behalf of your user.
For more information on the OAuth concept, please refer to our [documentation](https://doc.upvest.co/docs/oauth2-authentication).
Again, please retrieve your client credentials from the [Upvest account management](https://login.upvest.co/).

```javascript
const { UpvestClienteleAPI } = require("@upvest/clientele-api");

const exampleUsername = "Example User";
const examplePassword = "ex@mp1e p@55w0rd";

const config = {
  baseURL: "https://api-playground.eu.upvest.co/1.0/",
  oauth2: {
    client_id: "j3sH4R1htxgTkdWPxRgyTQt2LSiovrKuziHAc8aJ",
    client_secret:
      "6hYU72rsW3VTl94hBqokzYZSuh5jaKLwjTYLouEhl7ndurkqn78lFYzeteU6kCHLzfZblT5WTf4p7R4VS9lR7vHne0Xm09DBolCG693Cp5qlwL7CHnUDAovjYPWxKP3z"
  }
};
```

Next, create an `UpvestClienteleAPI` object with these credentials and your user authentication data in order to authenticate your API calls on behalf of a user:

```javascript
const clientele = new UpvestClienteleAPI(
  config.baseURL,
  config.oauth2.client_id,
  config.oauth2.client_secret,
  exampleUsername,
  examplePassword
);
```

## Usage

### Get user wallets list

```javascript
(async () => {
  for await (const wallet of clientele.wallets.list()) {
    console.log(wallet);
  }
})();
```

### Create new wallet

```javascript
(async () => {
  try {
    let newWallet = await clientele.wallets.create(asset_id, password);
    console.log(newWallet);
  } catch (err) {}
})();
```

### Send transaction

```javascript
(async () => {
  try {
    // Retrieve the walletId
    const allWalletsGenerator = clientele.wallets.list();
    const allWallets = await allWalletsGenerator.next();
    const walletId = allWallets.value.id;
    const amount = 100000000000000000; // 0.1 ETH * 10^18 = 100000000000000000 WEI
    const fee = 4000000000000000; // 0.004 ETH * 10^18 = 4000000000000000 WEI

    // Send the transaction
    const recipient = "0x05b3Ca5e520583e3BBfb4DdDf5bd212CB19b2169";
    const transaction = await clientele.transactions.create(
      walletId,
      password,
      recipient,
      ASSET_ID,
      amount,
      fee
    );
    const transactionHash = transaction.txhash;
    console.log(`https://ropsten.etherscan.io/tx/${transactionHash}`);
  } catch (err) {}
})();
```

For more examples, please check out our test-suite at https://www.npmjs.com/package/@upvest/api-tests

# License

This software is released under the [MIT License](https://github.com/toknapp/js-api-clients/tree/master/LICENSE)

# Client library for the Upvest Tenancy API

This API encompasses operations for managing users within your tenancy.

A tenancy is your "area" of Upvest, where you will be registering your users before authenticating them with OAuth2. When registering a user, you will be provided with a recovery kit to forward on to the user.

This API client is based on [axios](https://www.npmjs.com/package/axios).

Features

- Create new tenant
- Get users list
- Change user password
- Delete user

## Installation

Using yarn:

```
$ yarn add @upvest/tenancy-api
```

Using npm:

```
$ npm install @upvest/tenancy-api
```

In order to retrieve your API credentials for using this client, you'll need to [sign up with Upvest](https://login.upvest.co/sign-up).
