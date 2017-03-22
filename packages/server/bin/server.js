const Koa = require('koa');
const Searcher = require('@cardstack/elasticsearch/searcher');
const Writers = require('@cardstack/server/writers');
const SchemaCache = require('@cardstack/server/schema-cache');
const logger = require('heimdalljs-logger');
const log = logger('server');
const commander = require('commander');
const path = require('path');

function runServer(port, seedModels) {
  let schemaCache = new SchemaCache(seedModels);
  let app = new Koa();
  app.use(require('@cardstack/jsonapi/middleware')(new Searcher(schemaCache), new Writers(schemaCache)));
  app.listen(port);
  log.info("server listening on %s", port);
}


function commandLineOptions() {
  commander
    .usage('[options] <seed-config-file>')
    .option('-p --port <port>', 'Server listen port.', 3000)
    .parse(process.argv);

  if (commander.args.length < 1) {
    commander.outputHelp();
    process.exit(-1);
  }

  commander.seedConfigFile = path.resolve(commander.args[0]);
  return commander;
}

function loadSeedModels(options) {
  try {
    return require(options.seedConfigFile);
  } catch (err) {
    process.stderr.write(`Unable to load models from your seed-config-file (${options.seedConfigFile}), ${err}\n`);
    process.exit(-1);
  }
}

let options = commandLineOptions();
let seedModels = loadSeedModels(options);
runServer(options.port, seedModels);
