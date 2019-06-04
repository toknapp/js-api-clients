#!/usr/bin/env node

const childProcess = require('child_process');

const parseOpts = require('minimist');


class Standalone {
  constructor() {
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

    this.LIST_MODE = opts.list;
    this.FORCE_MODE = opts.force;

    if (typeof opts.config === 'string') {
        opts.config = [opts.config];
    }
    this.desiredConfigIds = new Set(opts.config.filter(s => s.length > 0));

    if (typeof opts.test === 'string') {
        opts.test = [opts.test];
    }
    this.desiredTestIds = new Set([...opts.test.filter(s => s.length > 0), ...opts._]);

    this.runner = childProcess.fork(`${__dirname}/runner.js`);

    this.runner.on('close', (code, signal) => {
      console.log('RUNNER close:', { code, signal });
    });

    this.runner.on('disconnect', () => {
      console.log('RUNNER disconnect.');
    });

    this.runner.on('error', err => {
      console.log('RUNNER error:', err);
    });

    this.runner.on('exit', (code, signal) => {
      console.log('RUNNER exit:', { code, signal });
    });

    // this.runner.on('message', message => {
    //   console.log('RUNNER message:', message);
    // });
  }

  getAvailableConfigsAndTests() {
    return new Promise((resolve, reject) => {
      const onStateMessage = msg => {
        if (msg.eventName == 'runner:state') {
          if (msg.setupComplete) {
            resolve({ configs: new Set(msg.configs), tests: new Set(msg.tests) });
          }
          else {
            this.runner.once('message', onStateMessage);
            setTimeout(() => this.runner.send({ eventName: 'getState' }), 20);
          }
        }
      }
      this.runner.once('message', onStateMessage);
      this.runner.send({ eventName: 'getState' });
    });
  }

  allFinished() {
    return new Promise((resolve, reject) => {
      const onListJobsMessage = msg => {
        if (msg.eventName == 'runner:jobList') {
          let allFinished = true;

          for (const [jobId, jobState] of Object.entries(msg.jobList)) {
            const jobFinished = (jobState.failed || jobState.crashed || jobState.timedOut || jobState.ended || jobState.returned);
            allFinished = allFinished && jobFinished;
          }
          if (allFinished) {
            this.runner.off('message', onListJobsMessage);
            resolve(msg.jobList);
          }
          else {
            // this.runner.once('message', onListJobsMessage);
            setTimeout(() => this.runner.send({ eventName: 'listJobs' }), 200);
          }
        }
      }
      this.runner.on('message', onListJobsMessage);
      this.runner.send({ eventName: 'listJobs' });
    });
  }

  getFullStates(jobIds) {
    return new Promise((resolve, reject) => {
      const targetJobIds = new Set(jobIds);
      const collectedJobIds = new Set();
      const fullStates = {};
      const onFullStateMessage = msg => {
        if (msg.eventName == 'job:fullState' && targetJobIds.has(msg.jobId)) {
          collectedJobIds.add(msg.jobId)
          fullStates[msg.jobId] = msg;
          if (collectedJobIds.size == targetJobIds.size) {
            this.runner.off('message', onFullStateMessage);
            resolve(fullStates);
          }
        }
      }
      this.runner.on('message', onFullStateMessage);
      for (const jobId of jobIds) {
        this.runner.send({ eventName: 'getJobFullState', jobId });
      }
    });
  }

  async listMode() {
    const { configs: availableConfigIds, tests: availableTestIds } = await this.getAvailableConfigsAndTests();
    this.runner.send({ eventName: 'exit' });
    console.log('Available configs:', availableConfigIds);
    console.log('Available tests:', availableTestIds);
  }

  async runMode() {
    const { configs: plannedConfigIds, tests: plannedTestIds } = await this.getAvailableConfigsAndTests();
    if (this.desiredConfigIds.size > 0) {
      plannedConfigIds.forEach(configId => {
        if (!this.desiredConfigIds.has(configId)) plannedConfigIds.delete(configId);
      });
    }
    if (this.desiredTestIds.size > 0) {
      plannedTestIds.forEach(testId => {
        if (!this.desiredTestIds.has(testId)) plannedTestIds.delete(testId);
      });
    }
    console.log('Planned configs:', plannedConfigIds);
    console.log('Planned tests:', plannedTestIds);

    for (const configId of plannedConfigIds) {
      for (const testId of plannedTestIds) {
        this.runner.send({
          eventName: 'startJob',
          testId,
          configId,
          timeout: 10 * 60 * 1000,
        });
      }
    }

    const jobList = await this.allFinished();
    const fullStates = await this.getFullStates(Object.keys(jobList));
    console.log(fullStates);

    this.runner.send({ eventName: 'exit' });
  }

  run() {
    if (this.LIST_MODE) {
      this.listMode().then(() => {
        // TODO ensure that runner exits
        // this.runner.kill();
        process.exit();
      });
    }
    else {
      this.runMode().then(() => {
        // TODO ensure that runner exits
        // this.runner.kill();
        process.exit();
      });
    }
  }
}

const standalone = new Standalone();

standalone.run();
