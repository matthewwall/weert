#!/usr/bin/env node

"use strict";

/*
 *  Default values
 */
var mongo_url                 = "mongodb://localhost:27017/weert";
var mongo_test_url            = "mongodb://localhost:27017/weert_test";
var default_port              = '3000';
var platforms_manager_options = {locations_collection: {}};
var streams_manager_options   = {packets_collection: {capped: true, size: 1000000, max: 3600}};

/*
 * Requires
 */
var async        = require('async');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var debug        = require('debug')('weert:server');
var express      = require('express');
var http         = require('http');
var logger       = require('morgan');
var mongodb      = require('mongodb');
var path         = require('path');
var socket_io    = require('socket.io');

var platforms       = require('./platforms');
var streams         = require('./streams');
var pubsub          = require('./pubsub');
var platform_routes = require('./routes/platform_routes');
var stream_routes   = require('./routes/stream_routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');

app.use(logger('dev')); // Log all requests to the server to the console
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

/*
 * Set up server
 */
var port = normalizePort(default_port);
app.set('port', port);
var server = http.createServer(app);

/*
 * Listen for any new, incoming websocket connections. Then notify
 * them if there is a new packet.
 */
var io = socket_io(server);
io.on('connection', function (socket) {
    debug(new Date(), "A new client has connected");

    socket.emit('news', {hello: 'You are connected to the WeeRT server'});

    // New client has connected. Subscribe him/her to any new packets.
    // Save the unsubscribe handle so we can unsubscribe the client should
    // his connection go away.
    var unsubscribe_handle = pubsub.subscribe('new_packet', function (packet_info) {
        // New packet has arrived. Figure out which websocket subscription to push it out on.
        var subscription_name = "packet-" + packet_info.streamID;
        socket.emit(subscription_name, packet_info.packet);
    });

    socket.on('disconnect', function () {
        var N = pubsub.unsubscribe(unsubscribe_handle);
        debug(Date.now(), "A client has disconnected, leaving", N, "subscriber(s).");
    });
});

/*
 * Set up the databases
 */
var MongoClient       = mongodb.MongoClient;
var platforms_manager = undefined;
var streams_manager   = undefined;
var setup_database    = function (callback) {
    MongoClient.connect(mongo_url, function (err, database) {
        if (err) throw err;
        platforms_manager = new platforms.PlatformsManager(database, platforms_manager_options);
        streams_manager   = new streams.StreamsManager(database, streams_manager_options);
        return callback(null);
    });
};

var platforms_test_manager = undefined;
var streams_test_manager   = undefined;
var setup_test_database    = undefined;
// If this is a 'development' environment, set up the test database as well
if (app.get('env') === 'development') {
    setup_test_database = function (callback) {
        MongoClient.connect(mongo_test_url, function (err, database) {
            if (err) throw err;
            platforms_test_manager = new platforms.PlatformsManager(database, platforms_manager_options);
            streams_test_manager   = new streams.StreamsManager(database, streams_manager_options);
            return callback(null);
        });
    }
} else {
    setup_test_database = function (callback) {
        return callback(null);
    }
}
;

var setup_routes = function (callback) {
    // Serve all static files from the "public" subdirectory:
    app.use(express.static(path.join(__dirname, '../public')));

    app.use('/api/v1', platform_routes(platforms_manager));
    app.use('/api/v1', stream_routes(streams_manager));
    // If this is a 'development' environment, set up the test routing as well
    if (app.get('env') === 'development') {
        app.use('/test/v1', platform_routes(platforms_test_manager));
        app.use('/test/v1', stream_routes(streams_test_manager));
    }

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        debug("caught 404");
        var err    = new Error('Not Found');
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
    return callback(null);
};

async.series(
    [
        function (callback) {
            async.parallel([
                    setup_database,
                    setup_test_database
                ],
                function (err, results) {
                    if (err) return callback(err);
                    debug("ready", results);
                    return callback(null);
                }
            );
        },
        setup_routes,
        function (callback) {
            server.on('error', onError);
            server.listen(port, function () {
                var addr = server.address();
                var bind = typeof addr === 'string'
                    ? 'pipe ' + addr
                    : 'port ' + addr.port;
                debug('Listening on ' + bind);
                return callback(null);
            });
        }
    ],
    function (err) {
        if (err) {
            debug("Got error attempting to set up Mongo or the RESTful interfaces:", err);
            throw err;
        }
        debug("Finished setup.");
    }
);


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
