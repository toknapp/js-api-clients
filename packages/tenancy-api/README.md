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

The Upvest API uses the notion of _tenants_, which represent customers that build their platform upon the Upvest API. The end-users of the tenant (i.e. your customers), are referred to as _clients_. A tenant is able to manage their users directly (CRUD operations for the user instance) and is also able to initiate actions on the user's behalf (create wallets, send transactions).

The authentication via API keys and secret allows you to perform all tenant related operations.
Please create an API key pair within the [Upvest account management](https://login.upvest.co/).

The default `BASE_URL` for both authentication objects is `https://api.playground.upvest.co`, but feel free to adjust it, once you retrieve your live keys.

```javascript
const { UpvestTenancyAPI } = require("@upvest/tenancy-api");
const config = {
  baseURL: "https://api-playground.eu.upvest.co/1.0/",
  apikey: {
    key: "tPKWL9B_yTgfSToOFJmLyg",
    secret: "9O7tLb1ub6qLHZQ00ButDOcfvw9g7Gn8GzFB4WmsUrA",
    passphrase: "dlKsARh6U3chEQK0WBTU-u-qqn-l4IknmXH1jRGW_fQ"
  }
};
```

Next, create an `UpvestTenancyAPI` object in order to authenticate your API calls:

```javascript
const tenancy = new UpvestTenancyAPI(
  config.baseURL,
  config.apikey.key,
  config.apikey.secret,
  config.apikey.passphrase
);
```

## Usage

### Create user

```javascript
(async () => {
  const username = "Example User";
  const password = "ex@mp1e p@55w0rd";

  let exampleUser;
  try {
    exampleUser = await tenancy.users.create(username, password);
  } catch (error) {
    // Handle error
  }

  console.log(exampleUser.username);

  for await (const user of tenancy.users.list()) {
    console.log(user.username);
  }
})();
```

### Get users list

```javascript
(async () => {
  try {
    const iterator = this.tenancy.users.list();
    const user = await iterator.next();
    console.log("user 1: ", user);
    if (!user.done) {
      const nextUser = await iterator.next(user);
      console.log("user 2: ", nextUser);
    }
  } catch (err) {}
})();
```

### Change user password

```javascript
const newPassword = "n3w p@55w0rd";
(async () => {
  try {
    await tenancy.users.updatePassword(username, password, newPassword);
    console.log("Password was updated.");
  } catch (err) {}
})();
```

### Delete user

```javascript
(async () => {
  try {
    await tenancy.users.delete(username);
    console.log("User was deleted.");
  } catch (err) {}
})();
```

For more examples, please check out our test-suite at https://www.npmjs.com/package/@upvest/api-tests

# License

This software is released under the [MIT License](https://github.com/toknapp/js-api-clients/tree/master/LICENSE)
