// containerConfig.js

var container = require('kontainer-di');
var dbConfig = require('./config/database');
var serverConfig = require('./config/server');
var databaseFactory = require('./services/database');
var streamFactory = require('./services/stream');
var serverFactory = require('./services/server');

// Configs don't have any dependencies and are just plain JS objects
container.register('dbConfig', [], dbConfig);
container.register('serverConfig', [], serverConfig);

// Database is implemented with a Factory function that expects a config
container.register('database', ['dbConfig'], databaseFactory);
// Same with the server.
container.register('server', ['serverConfig'], serverFactory);

container.register('streamFactory', ['database', 'dbConfig'], streamFactory);

// Export the configured container itself. It's a Singleton
module.exports = container;