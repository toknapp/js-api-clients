// copied from ../tests/util.js

function setDifference(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

function setEqual(setA, setB) {
  return (
    (setDifference(setA, setB).size == 0)
    &&
    (setDifference(setB, setA).size == 0)
  );
}

const tErrorFail = (t, error, message) => {
  if (error.response) {
    console.dir(error.response.config.url, {depth:null, colors:true});
    console.dir(error.response.config.headers, {depth:null, colors:true});
    console.dir(error.response.status, {depth:null, colors:true});
    console.dir(error.response.data, {depth:null, colors:true});
  }
  else {
    console.dir(error, {depth:null, colors:true});
  }
  t.fail(message)
  t.end();
  return;
}


module.exports = {
  setDifference, setEqual, tErrorFail
};

