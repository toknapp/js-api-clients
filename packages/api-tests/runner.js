#!/usr/bin/env node

const EventEmitter = require('events');
const resolvePath = require('path').resolve;

const glob = require('glob');
const uuidv4 = require('uuid/v4');

const { getTestenv } = require('./testenv.js');
const { getPartials } = require('./partials.js');


function isChildProcessWithIPC() {
  return 'send' in process;
}


async function gatherFiles(searchPattern, extractIdFromFilename) {
  const gathered = {};

  const cwd = process.cwd();
  const files = glob.sync(searchPattern);

  if (!Array.isArray(files)) {
    throw new TypeError('unknown error: glob.sync did not return an array or throw. Please report this.');
  }

  files.forEach(function (file) {
    const id = extractIdFromFilename(file);
    gathered[id] = require(resolvePath(cwd, file));
  });

  return gathered;
}


class Job {
  constructor(test, config, send, testId, configId, timeOut) {
    this.send = send;
    this.testId = testId;
    this.configId = configId;
    this.title = test.title;

    this.jobId = uuidv4();
    this.setupEndPromise(timeOut);

    this.recordedMessages = [];
    this.failed = false;
    this.ended = false;
    this.returned = false;

    this.schedule(test, config);
    this.emit('job:setupComplete');
  }

  setupEndPromise(timeOut) {
    this.endPromise = new Promise((resolve, reject) => {
      const timeoutID = setTimeout(() => {
        this.emit('job:timeout', true);
        this.ended = true;
        resolve('timeout');
      }, timeOut);
      this.resolveEndPromise = () => {
        clearTimeout(timeoutID);
        this.emit('job:end', true);
        this.ended = true;
        resolve('end');
      };
    });
  }

  schedule(test, config) {
    const harness = this.harness;
    const testenv = getTestenv(config);
    const partials = getPartials(testenv);
    const env = {
      t: harness,
      inspect: harness.inspect, // support legacy test code
      testenv,
      partials,
    }
    process.nextTick(() => {
      test.test(env).then(() => {
        this.returned = true;
        this.emit('job:return', true);
      });
    });
  }

  emitFullState() {
    this.emit('job:fullState', this.fullState);
  }

  get state() {
    return {
      failed: this.failed,
      ended: this.ended,
      returned: this.returned,
    }
  }

  get fullState() {
    return {
      title: this.title,
      recordedMessages: this.recordedMessages,
      ...this.state,
    }
  }

  get id() {
    return this.jobId;
  }

  record(eventName, message) {
    this.recordedMessages.push({eventName:eventName, ...message});
  }

  emit(eventName, message) {
    const fullMessage = {
      testId: this.testId,
      configId: this.configId,
      jobId: this.jobId,
      timestamp: Date.now(),
      message
    };
    if (eventName != 'job:fullState') {
      this.record(eventName, fullMessage);
    }
    this.send(eventName, fullMessage);
  }

  assert(operator, asserted, actual, expected, message) {
    this.failed = this.failed || ! asserted;
    this.emit('job:assert', { operator, asserted, actual, expected, message });
  }

  get harness() {
    return {
      end: () => this.resolveEndPromise(),
      comment: message => this.emit('job:comment', message),
      inspect: (...things) => this.emit('job:inspect', things),
      equal: (actual, expected, message) => this.assert('equal', (actual == expected), actual, expected, message),
      fail: message => this.assert('fail', false, false, true, message),
      notEqual: (actual, expected, message) => this.assert('notEqual', (actual != expected), actual, expected, message),
      notOk: (value, message) => this.assert('notOk', ! Boolean(value), value, false, message),
      ok: (value, message) => this.assert('ok', Boolean(value), value, true, message),
    }
  }
}


class Runner extends EventEmitter {
  constructor() {
    super();
    this.setupComplete = false;
    this.tests = [];
    this.configs = [];
  }

  emitMessage(eventName, message) {
    message.eventName = eventName;
    message.runnerId = this.runnerId;
    message.timestamp = message.timestamp || Date.now();
    this.emit('message', message);
  }

  async setup() {
    this.runnerId = uuidv4();
    this.jobs = new Map();
    const testsRootDir = `${__dirname}/tests/`;
    // const tests = await gatherFiles(testsRootDir + '**/*.js', fn => fn.match(new RegExp(testsRootDir + '(?<id>.*)\.js$')).groups.id);
    this.tests = await gatherFiles(testsRootDir + 'clientele/{oauth2,fake1,fake2}.js', fn => fn.match(new RegExp(testsRootDir + '(?<id>.*)\.js$')).groups.id);

    const configsRootDir = `${__dirname}/`;
    this.configs = await gatherFiles(configsRootDir + '.test_config-*.json', fn => fn.match(new RegExp(configsRootDir + '.test_config-(?<id>.*)\.json$')).groups.id);

    this.exitPromise = new Promise((resolve, reject) => {
      this.exit = () => resolve('exit');
    });

    // this.emitMessage('runner:setupComplete', {
    //   tests: Object.keys(this.tests),
    //   configs: Object.keys(this.configs),
    // });
    // console.log('runner:setupComplete', {
    //   tests: Object.keys(this.tests),
    //   configs: Object.keys(this.configs),
    // });
    this.setupComplete = true;
  }

  async run() {
    await this.setup();
    await this.exitPromise;
  }

  receiveMessage(message) {
    if (! 'eventName' in message) {
      console.error('Can not process IPC message without `eventName` field:', message);
      return;
    }
    switch (message.eventName) {
      case 'getState':
        this.getState();
        break;
      case 'exit':
        this.exit();
        break;
      case 'startJob':
        this.startJob(message.testId, message.configId, message.timeout);
        break;
      case 'listJobs':
        this.listJobs();
        break;
      case 'getJobFullState':
        this.getJobFullState(message.jobId);
        break;
      case 'deleteReturnedJobs':
        this.deleteReturnedJobs();
        break;
    }
  }

  getState() {
    this.emitMessage('runner:state', {
      setupComplete: this.setupComplete,
      tests: Object.keys(this.tests),
      configs: Object.keys(this.configs),
    });
  }

  startJob(testId, configId, timeout) {
    // TODO check if testId, configId and canRun() are viable.
    const test = this.tests[testId];
    const config = this.configs[configId];
    const job = new Job(
      test,
      config,
      (eventName, message) => this.emitMessage(eventName, message),
      testId,
      configId,
      timeout,
    );
    this.jobs.set(job.id, job);
  }

  listJobs() {
    const jobList = {}
    for (const [jobId, job] of this.jobs) {
      jobList[jobId] = job.shortState;
    }
    this.emitMessage('runner:jobList', jobList);
  }

  getJobFullState(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.emitFullState();
    }
    // TODO fail on job not found
  }

  deleteReturnedJobs() {
    for (const [jobId, job] of this.jobs) {
      if (job.state.returned) {
        this.jobs.delete(jobId);
      }
    }
  }
}


async function main() {
  if (isChildProcessWithIPC()) {
    const runner = new Runner();
    // TODO Make sure that non-JSON values are not coerced to `null` but to a meaningful string representations.
    runner.on('message', message => process.send(message));
    process.on('message', message => runner.receiveMessage(message));
    await runner.run();
  }
  else {
    console.error('Must be run as a child process with `require("child_process").fork()`!');
  }
  process.exit();
}


main();
