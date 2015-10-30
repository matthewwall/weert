/*
 *               SERVER CODE
 */

"use strict";

var mongo_url = "mongodb://localhost:27017/weert";
var port = process.env.PORT || 3000;
var loop_manager_options = {collection:{capped: true, size: 1000000, max: 3600}};

// requires
var http = require('http');
var express = require('express');
var socket_io = require('socket.io');
var path = require('path');
var bodyParser = require('body-parser');
var pubsub = require('./pubsub');
var async = require('async');
var MongoClient = require('mongodb').MongoClient;

//var archive = require('./archive');
var loop = require('./loop');

var app = express();
var server = http.createServer(app);


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
    var unsubscribe_handle = pubsub.subscribe('new_packet', function (packet_info) {
        // New packet has arrived. Figure out which websocket subscription to push it out on.
        var subscription_name = "packet-" + packet_info.instrumentID;
        socket.emit(subscription_name, packet_info.packet);
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

var db = undefined;
var loop_manager = undefined;

var setup_databases = function (callback){
    // Initialize connection once
    MongoClient.connect(mongo_url, function(err, database) {
        if(err) throw err;
        db = database;
        loop_manager = new loop.LoopManager(db, loop_manager_options);
        console.log("loop collection ready");
        // Signal that the databases are set up with no errors.
        return callback(null);
    });
};

var setup_routes = function (callback) {

    // RESTful interface for requesting packets from a platform and instrument
    // between a start and stop time.
    app.get('/api/loop/:instrumentID', function (req, res) {
        // Get the instrumentID out of the route path
        var instrumentID = req.params.instrumentID;
        // Is an aggregation being requested?
        if (req.query.aggregate_type !== undefined){
            // Yes, an aggregation is being requested.
            console.log("Request for aggregation", req.query.aggregate_type,
                "with start, stop times of", req.query.start, req.query.stop);
            var obs_type = req.query.obs_type;
            loop_manager.aggregate(instrumentID, obs_type, req.query, function (err, result) {
                if (err) {
                    console.log("Unable to satisfy request. Reason", err);
                    res.status(400).send(err.message);
                } else {
                    res.send(JSON.stringify(result));
                }
            });
        } else {
            console.log("Request for packets with start, stop times of", req.query.start, req.query.stop);
            // If a 'sort' parameter is included, convert it from JSON
            if (req.query.sort !== undefined) {
                req.query.sort = JSON.parse(req.query.sort);
            }

            loop_manager.find(instrumentID, req.query, function (err, packet_array) {
                if (err) {
                    console.log("Unable to satisfy request. Reason", err);
                    res.status(400).send(err.message);
                } else {
                    console.log("# of packets=", packet_array.length);
                    res.send(JSON.stringify(packet_array));
                }
            });
        }
    });

    // RESTful interface that listens for incoming loop packets and then
    // stores them in the MongoDB database
    app.post('/api/loop/:instrumentID', function (req, res) {
        // Get the instrumentID
        var instrumentID = req.params.instrumentID;
        // Get the packet out of the request body:
        var packet = req.body.packet;
        var ts = new Date(packet.timestamp);
        // Insert it into the database
        loop_manager.insertOne(instrumentID, packet, function (err, result) {
            // Send back an appropriate acknowledgement:
            if (err) {
                console.log("Unable to insert packet with timestamp", ts);
                if (err.code === 11000)
                    console.log("Reason: duplicate time stamp");
                else
                    console.log("Error code:", err.code);
                res.status(400).send("Error code " + err.code);
            } else {
                res.sendStatus(200);
                // Let any interested subscribers know there is a new packet:
                pubsub.publish('new_packet', {"packet": packet, "instrumentID" : instrumentID}, this);
            }
        });
    });

    console.log("routes ready");
    // Signal that the routes are set up and with no errors
    callback(null);
};

async.series(
    [
        function (callback) {
            async.parallel([
                    setup_databases,
                    setup_routes
                ],
                function (err, results) {
                    if (err) return callback(err);
                    console.log("dbs and routes ready", results);
                    return callback(null);
                }
            );
        },
        function (callback) {
            server.listen(port, function(){
                console.log("Server listening on port %d", port);
                return callback(null);
            });
        }
    ],
    function (err) {
        if (err) {
            console.log("Got error attempting to set up Mongo or the RESTful interfaces:", err);
            throw err;
        }
        console.log("Finished setup.");
    }
);
