#!/usr/bin/env node
/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
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

app.use(logger('dev')); // Log all requests to the server to the console
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Serve all static files from the "client" subdirectory:
app.use(express.static(path.join(__dirname, '../client')));

// app.use('/api/v1', platform_routes(platforms_manager));

// So far, it's pretty much Express boilerplate.
// Now set up the WeeRT database and routes
var dbconfig      = require('./config/database');
var dbPromise     = require('./services/database')(dbconfig);
var streamManager = require('./services/stream')(dbPromise, dbconfig);
var stream_routes = require('./routes/stream_routes');
app.use('/api/v1', stream_routes(streamManager));

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
http.createServer(app).listen(serverConfig.port);
