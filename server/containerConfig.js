// containerConfig.js

var container = require('kontainer-di');
var dbConfig = require('./config/database');
var databaseFactory = require('./services/database');
var streamFactory = require('./services/stream');

//config doesn't have any dependency and it's a plain JS object
container.register('dbConfig', [], dbConfig);

//database is implemented with a Factory function that expects a config
container.register('database', ['dbConfig'], databaseFactory);

//our service only depends now on the database module
container.register('streamFactory', ['database', 'dbConfig'], streamFactory);

//export the configured container itself (yep it's a Singleton)
module.exports = container;