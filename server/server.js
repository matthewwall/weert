#!/usr/bin/env node
/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var bodyParser = require('body-parser');
var debug      = require('debug')('weert:server');
var express    = require('express');
var http       = require('http');
var logger     = require('morgan');
var path       = require('path');
var app        = express();

// Set up the view engine
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'hbs');

// Log all requests to the server to the console
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Serve all static files from the "client" subdirectory:
app.use(express.static(path.join(__dirname, '../client')));

// Set up the WeeRT database
var dbConfig        = require('./config/db');
var dbPromise       = require('./services/database')(dbConfig);
var streamManager   = require('./services/stream')(dbPromise, dbConfig);
var platformManager = require('./services/platform')(dbPromise, dbConfig, streamManager);

// Set up the routes
var auth_routes     = require('./routes/auth_routes');
var stream_routes   = require('./routes/stream_routes');
var platform_routes = require('./routes/platform_routes');
app.use('/api/v1', auth_routes());
app.use('/api/v1', stream_routes(streamManager));
app.use('/api/v1', platform_routes(platformManager));

if (app.get('env') === 'development') {
    // Create a duplicate test environment, that uses the /test/v1 URL:
    var testDbConfig        = require('./config/testdb');
    var testDbPromise       = require('./services/database')(testDbConfig);
    var testStreamManager   = require('./services/stream')(testDbPromise, testDbConfig);
    var testPlatformManager = require('./services/platform')(testDbPromise, testDbConfig, testStreamManager);

    app.use('/test/v1', stream_routes(testStreamManager));
    app.use('/test/v1', platform_routes(testPlatformManager));
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    debug("caught 404");
    var err    = new Error('Page not found: ' + req.originalUrl);
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error  : err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error  : {}
    });
});


/*
 * Start the server
 */

var serverConfig = require('./config/server');
var server       = http.createServer(app);
server.listen(serverConfig.port);
console.log("Listening on port", serverConfig.port);

// Start waiting for websocket clients:
var io = require('./services/websocket')(server, app);
