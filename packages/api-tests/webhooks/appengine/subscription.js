const WebSocket = require('ws');

async function getAppengineSubscription(wsUrl) {
  const ws = new WebSocket(wsUrl);

  return ws;
}

module.exports = {
  getAppengineSubscription,
};
