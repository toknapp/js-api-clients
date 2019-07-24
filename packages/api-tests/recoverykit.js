const path = require('path');

const protobuf = require('protobufjs');

const { decryptSealedBox } = require('./sodium.js');


let RecoveryKit;

const getRecoveryKitProtobufHandler = async () => {
  if (! RecoveryKit) {
    const rkPb2Filename = path.resolve(__dirname, 'recoverykit.proto');
    const pb2root = await protobuf.load(rkPb2Filename);
    RecoveryKit = pb2root.lookupType("co.upvest.recoverykit.RecoveryKit");
  }
  return RecoveryKit;
}


// see https://www.npmjs.com/package/protobufjs#toolset , ConversionOptions
const pb2ConversionOptions = {
  enums: String,  // enums as string names

  // We don't have long.js
  // longs: String,  // longs as strings (requires long.js)

  bytes: String,  // bytes as base64 encoded strings
  defaults: true, // includes default values
  arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
  objects: true,  // populates empty objects (map fields) even if defaults=false
  oneofs: true    // includes virtual oneof fields set to the present field's name
}


const unpackRecoveryKit = async (recoveryKitBase64, publicKeyBase64, privateKeyBase64) => {
  const recoveryKitProtobufBinary = await decryptSealedBox(recoveryKitBase64, publicKeyBase64, privateKeyBase64);
  const RecoveryKit = await getRecoveryKitProtobufHandler();
  const recoveryKitProtobufMessage = RecoveryKit.decode(recoveryKitProtobufBinary);
  const recoveryKit = RecoveryKit.toObject(recoveryKitProtobufMessage, pb2ConversionOptions);
  return recoveryKit;
};


module.exports = {
  unpackRecoveryKit,
};
