const { resolve } = require('path');
const program = require('commander');

program
  .option('-c, --config [type]', 'Use the specified configuration file [.test_config.json]', '.test_config.json')
  .option('-f, --force', 'Force something')
  .option('-p, --parallel [number]', 'Some tests can be parallelized, this says by how much?', 1)
  .parse(process.argv);

const configFilePath = resolve(program.config);

console.log('Using the "%s" config file', configFilePath);

test_config = require(configFilePath);

module.exports = { configFilePath, test_config, forced:Boolean(program.force), parallel:Number(program.parallel) };
