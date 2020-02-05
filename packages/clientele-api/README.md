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

const USERNAME = "Example User";
const PASSWORD = "ex@mp1e p@55w0rd";

const config = {
  baseURL: "https://api-playground.eu.upvest.co/1.0/",
  oauth2: {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }
};
```

### Response objects

The response objects are designed around users, wallets, transactions and assets. If you retrieve more than one object (for example: `tenancy.users.list()`) an array of those objects will be returned.

#### Wallet object

The wallet response object has the following properties:

```javascript
let wallet = clientele.wallets.retrieve("wallet_id");
const { id, address, balances, protocol, status } = wallet;
```

#### Asset object

The transaction response object has the following properties:

```javascript
let asset = clientele.assets.retrieve("asset_id");
const { id, name, symbol, exponent, protocol, metadata } = asset;
```

#### Transaction object

The transaction response object has the following properties:

```javascript
let transaction = wallet.transactions.retrieve("transaction_id");
const {
  quantity,
  fee,
  recipient,
  sender,
  id,
  status,
  txhash,
  wallet_id,
  asset_id,
  asset_name,
  exponent
} = transaction;
```

## Usage

Create an `UpvestClienteleAPI` object with these credentials and your user authentication data in order to authenticate your API calls on behalf of a user:

```javascript
const clientele = new UpvestClienteleAPI(
  config.baseURL,
  config.oauth2.client_id,
  config.oauth2.client_secret,
  USERNAME,
  PASSWORD
);
```

#### Assets

##### List available assets

```javascript
(async () => {
  let assets = [];
  for await (let asset of this.clientele.assets.list()) assets.push(asset);
  console.log("Available assets: ", assets);
})();
```

##### Retrieve specific asset by asset_id

```javascript
(async () => {
  try {
    const asset = await this.clientele.assets.retrieve(ASSET_ID);
    console.log("Asset: ", asset);
  } catch (_) {}
})();
```

#### Wallets

##### Get user wallets list

```javascript
(async () => {
  let wallets = [];
  for await (const wallet of clientele.wallets.list()) {
    wallets.push(wallet);
  }
  console.log(wallets);
})();
```

##### Create new wallet

```javascript
(async () => {
  try {
    let newWallet = await clientele.wallets.create(ASSET_ID, PASSWORD);
    console.log(newWallet);
  } catch (_) {}
})();
```

##### Retrieve specific wallet for a user

```javascript
(async () => {
  try {
    let wallet = await clientele.wallets.retrieve(WALLET_ID);
    console.log(wallet);
  } catch (_) {}
})();
```

#### Transactions

##### Create transaction

```javascript
(async () => {
  try {
    const AMOUNT = 100000000000000000; // 0.1 ETH * 10^18 = 100000000000000000 WEI
    const FEE = 4000000000000000; // 0.004 ETH * 10^18 = 4000000000000000 WEI

    // Send the transaction
    const RECIPIENT = "0x05b3Ca5e520583e3BBfb4DdDf5bd212CB19b2169";
    const transaction = await clientele.transactions.create(
      WALLET_ID,
      PASSWORD,
      RECIPIENT,
      ASSET_ID,
      AMOUNT,
      FEE
    );
    const transactionHash = transaction.txhash;
    console.log(transaction);
    console.log(`https://ropsten.etherscan.io/tx/${transactionHash}`);
  } catch (_) {}
})();
```

##### List all transactions of a wallet for a user

```javascript
(async () => {
  let transactions = [];
  for await (let transaction of this.clientele.transactions.list(WALLET_ID))
    transactions.push(transaction);
  console.log("Transactions: ", transactions);
})();
```

#### Retrieve specific transaction

```javascript
(async () => {
  try {
    let transaction = await this.clientele.transactions.retrieve(
      WALLET_ID,
      TRANSACTION_ID
    );
    console.log("Transaction: ", transaction);
  } catch (_) {}
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
