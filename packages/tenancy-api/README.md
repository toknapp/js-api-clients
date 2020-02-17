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

### API Keys Authentication

The Upvest API uses the notion of _tenants_, which represent customers that build their platform upon the Upvest API. The end-users of the tenant (i.e. your customers), are referred to as _clientele users_. A tenant is able to manage their users directly (CRUD operations for the user instance) and is also able to initiate actions on the user's behalf (create wallets, send transactions).

The authentication via API keys and secret allows you to perform all tenant related operations.
Please create an API key pair within the [Upvest account management](https://login.upvest.co/).

The default `BASE_URL` for both authentication objects is `https://api.playground.upvest.co`, but feel free to adjust it, once you retrieve your live keys.

```javascript
const { UpvestTenancyAPI } = require("@upvest/tenancy-api");
const config = {
  baseURL: "https://api-playground.eu.upvest.co/1.0/",
  apikey: {
    key: API_KEY,
    secret: API_SECRET,
    passphrase: API_PASSPHRASE
  }
};
```

## Response objects

The response objects are designed around users, wallets, transactions and assets. If you retrieve more than one object (for example: `tenancy.users.list()`) an array of those objects will be returned.

#### User object

The user response object has the following properties:

```javascript
let user = tenancy.users.retrieve("username");
const { username, recoverykit } = user;
```

## Usage

### Tenancy

Create an `UpvestTenancyAPI` object in order to authenticate your API calls

```javascript
const tenancy = new UpvestTenancyAPI(
  config.baseURL,
  config.apikey.key,
  config.apikey.secret,
  config.apikey.passphrase
);
```

and set-up user credentials

```javascript
const USERNAME = "Example_user";
const PASSWORD = "ex@mp1e_p@55w0rd";
```

#### User management

##### Create a user

```javascript
(async () => {
  try {
    let newUser = await tenancy.users.create(USERNAME, PASSWORD);
    console.log(newUser);
  } catch (_) {}
})();
```

##### Retrieve user

```javascript
(async () => {
  try {
    let user = await this.tenancy.users.retrieve(USERNAME);
    console.log(user);
  } catch (err) {
    console.log(err.response.statusText);
  }
})();
```

##### Get users list

```javascript
(async () => {
  let users = [];
  for await (let user of this.tenancy.users.list()) users.push(user);
  console.log(users);
})();
```

### Change user password

```javascript
const NEW_PASSWORD = "n3w p@55w0rd";
(async () => {
  try {
    await tenancy.users.updatePassword(USERNAME, PASSWORD, NEW_PASSWORD);
    console.log("Password was updated.");
  } catch (_) {}
})();
```

### Delete user

```javascript
(async () => {
  try {
    await tenancy.users.delete(USERNAME);
    console.log("User was deleted.");
  } catch (_) {}
})();
```

For more examples, please check out our test-suite at https://www.npmjs.com/package/@upvest/api-tests

# License

This software is released under the [MIT License](https://github.com/toknapp/js-api-clients/tree/master/LICENSE)
