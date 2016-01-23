#!/usr/bin/env node
/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// TODO: Need to create the platform and stream metadata collections on startup

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

// Set up the WeeRT database and routes
var dbconfig        = require('./config/database');
var dbPromise       = require('./services/database')(dbconfig);
var streamManager   = require('./services/stream')(dbPromise, dbconfig);
var platformManager = require('./services/platform')(dbPromise, dbconfig, streamManager);
var stream_routes   = require('./routes/stream_routes');
var platform_routes = require('./routes/platform_routes');
app.use('/api/v1', stream_routes(streamManager));
app.use('/api/v1', platform_routes(platformManager));

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
