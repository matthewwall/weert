/*
 *               SERVER CODE
 */

"use strict";

var mongo_url = "mongodb://localhost:27017/";
var port = process.env.PORT || 3000;
var loop_manager_options = {capped: true, size: 1000000, max: 3600};

// requires
var http = require('http');
var express = require('express');
var socket_io = require('socket.io');
var path = require('path');
var bodyParser = require('body-parser');
var pubsub = require('./pubsub');
var async = require('async');
var archiver = require('./archiver');
var loop = require('./loop');

var app = express();
var server = http.createServer(app);
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

//var dbhelper = require('./dbhelper');
//var archiver = require('./archiver');

/*
 * Listen for any new, incoming websocket connections. Then notify
 * them if there is a new packet.
 */

var io = socket_io(server);
io.on('connection', function (socket) {

    console.log(new Date(), "A new client has connected");

    socket.emit('news', {hello: 'You are connected to the WeeRT server'});

    // New client has connected. Subscribe him/her to any new packets.
    // Save the unsubscribe handle so we can unsubscribe the client should
    // his connection go away.
    var unsubscribe_handle = pubsub.subscribe('new_packet', function (packet) {
        socket.emit('packet', packet);
    });

    socket.on('disconnect', function () {
        var N = pubsub.unsubscribe(unsubscribe_handle);
        console.log(Date.now(), "A client has disconnected, leaving", N, "subscriber(s).");
    });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Serve all static files from the "public" subdirectory:
app.use(express.static(path.join(__dirname, '../public')));

var loop_manager = undefined;

var setup_loop_manager = function(callback) {
    // Pretty trivial. Could probably go synchronous.
    loop_manager = new loop.LoopManager(mongo_url, loop_manager_options);
    return callback(null);
};

var setup_archive_manager = function(callback) {
    // Place holder for now
    return callback(null);
};

var setup_database = function (callback) {
    async.parallel([setup_loop_manager, setup_archive_manager], function (err) {
            if (err) {
                console.log("Got error attempting to set up MongoDB database", err);
                return callback(err);
            }
        }
    );
    return callback(null);
};

var setup_routes = function (callback) {

    // RESTful interface that listens for incoming loop packets and then
    // stores them in the MongoDB database
    app.post('/api/loop', function (req, res) {
        // Get the packet out of the request body:
        var packet = req.body.packet;
        var ts = new Date(packet.timestamp);
        console.log("got packet timestamp", ts);
        // Insert it into the database
        loop_manager.insert(packet, function (err, result) {
            if (err) {
                console.log("Unable to insert packet with timestamp", ts);
                if (err.code === 11000)
                    console.log("Reason: duplicate time stamp");
                else
                    console.log("Error code:", err.code);
                res.status(400).send("Error code " + err.code);
            } else {
                res.sendStatus(200);
                // Let any interested parties know there is a new packet:
                pubsub.publish('new_packet', packet, this);
            }
        });
    });

    // RESTful interface that returns all packets in the database
    // between a start and stop time.
    app.get('/api/loop', function (req, res) {
        var start = +req.query.start;
        var stop = +req.query.stop || Date.now();
        var platform = req.query.platform;
        var instrument = req.query.instrument;
        console.log("Request for packets with start, stop times of", start, stop);

        loop_manager.find(start, stop, platform, instrument, function(err, packet_array){
            if (err) {
                console.log("Unable to satisfy request. Reason", err);
                res.sendStatus(400);
            } else {
                console.log("# of packets=", packet_array.length);
                res.send(JSON.stringify(packet_array));
            }
        });
    });

    // RESTful interface that listens for incoming archive records and then
    // stores them in the MongoDB database
    app.post('/api/archive', function (req, res) {
        // Get the record out of the request body:
        var record = req.body.record;
        console.log("got archive record with timestamp", new Date(record.dateTime));

        archiver.insert(record, function (err, result) {
            if (err) {
                console.log("Unable to insert record with timestamp", record['dateTime']);
                res.sendStatus(500);
            } else {
                res.sendStatus(200);
            }
        });
    });

    // Signal that the routes are set up and with no errors
    callback(null);
};

async.series([
        // Set up the database first, then the routes:
        setup_database,
        setup_routes
    ],
    function (err) {
        if (err) {
            console.log("Got error attempting to set up Mongo or the RESTful interfaces:", err);
            throw err;
        }
        console.log("Finished setup.", loop_manager);
    }
);


