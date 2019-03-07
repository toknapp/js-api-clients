const testenv = require('../../testenv.js');

// Shortcuts to most-used facilities.
const test = testenv.test;
const partials = testenv.partials;
const inspect = testenv.inspect;


test('Testing assets.list() and assets.retrieve()', async function (t) {
  const { username, password } = await partials.tCreateUser(t, testenv.tenancy);
  if (! username) return;

  const clientele = testenv.getClienteleAPI(username, password);

  t.comment('Test listing all assets, and retrieving each one of them.')
  for await (const asset of clientele.assets.list()) {
    // t.comment('Inspecting listed asset:');
    // inspect(asset);
    let retrievedAsset;
    try {
      retrievedAsset = await clientele.assets.retrieve(asset.id);
    }
    catch (error) {
      return partials.tErrorFail(t, error, 'Retrieving the asset failed.');
    }
    // t.comment('Inspecting retrieved asset:');
    // inspect(retrievedAsset);

    t.equal(asset.id, retrievedAsset.id, 'listed and retrieved asset.id are equal');
    t.ok(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(asset.id), 'asset.id matches UUID pattern');

    t.equal(asset.name, retrievedAsset.name, 'listed and retrieved asset.name are equal');
    t.equal(asset.symbol, retrievedAsset.symbol, 'listed and retrieved asset.symbol are equal');

    t.equal(asset.exponent, retrievedAsset.exponent, 'listed and retrieved asset.exponent are equal');
    t.equal(typeof asset.exponent, 'number', 'asset.exponent is a number');

    t.equal(asset.protocol, retrievedAsset.protocol, 'listed and retrieved asset.protocol are equal');
    t.notOk(asset.protocol.startsWith('co.upvest.kinds.'), 'asset.protocol does not start with "co.upvest.kinds."');
  }

  t.end();
});
