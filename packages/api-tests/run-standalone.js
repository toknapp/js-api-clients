#!/usr/bin/env node

const childProcess = require('child_process');

const parseOpts = require('minimist');

const optsConfig = {
  alias: {
    l: 'list',
    f: 'force',
    c: 'config',
    t: 'test',
  },
  boolean: ['l', 'list', 'f', 'force'],
  string: ['c', 'config', 't', 'test'],
  default: {
    c: [],
    t: [],
  }
};

const opts = parseOpts(process.argv.slice(2), optsConfig);

const LIST_MODE = opts.list;
const FORCE_MODE = opts.force;


function listMode() {
  return new Promise((resolve, reject) => {
    const runner = childProcess.fork(`${__dirname}/runner.js`);
    runner.on('message', (m) => {
      switch(m.eventName) {
        case 'runner:setupComplete':
          console.log('Available configs and tests:', m);
          runner.send({ eventName: 'exit' });
          resolve(true);
          break;
      }
    });
  });
}


function runMode() {
  return new Promise((resolve, reject) => {

    opts.config = opts.config.filter(s => s.length > 0);
    opts.test = opts.test.filter(s => s.length > 0);
    // TODO Also read opts._ to gather desired testIds

    console.log(opts);
    resolve(true);
    return;

    const runner = childProcess.fork(`${__dirname}/runner.js`);

    runner.on('message', (m) => {
      console.log('PARENT got message:', m);
      switch(m.eventName) {
        case 'runner:setupComplete':
          for (const configId of m.configs) {
            // TODO if configId(s) were given on the CLI, skip all others.
            for (const testId of m.tests) {
              console.log(`configId == ${configId} + testId == ${testId}`);
            }
          }
          runner.send({
            eventName: 'startJob',
            testId: 'clientele/fake1',
            configId: 'playground',
            timeout: 10 * 60 * 1000,
          });
          break;
        case 'job:end':
          runner.send({ eventName: 'exit' });
          break;
      }
    });


  });
}


if (LIST_MODE) {
  listMode().then(process.exit());
}
else {
  runMode().then(process.exit());
}
