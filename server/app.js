/*
 *               SERVER CODE
 */

var mongo_url = "mongodb://localhost:27017/wee_rt";
var port = process.env.PORT || 3000;

// requires
var http = require('http');
var express = require('express');
var socket_io = require('socket.io');
var path = require('path');
var bodyParser = require('body-parser');
var pubsub = require('./pubsub');
var mongo = require('mongodb');
var async = require('async');

var app = express();
var server = http.createServer(app);
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

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
    unsubscribe_handle = pubsub.subscribe('new_packet', function (packet) {
        socket.emit('packet', packet);
    });

    socket.on('disconnect', function () {
        N = pubsub.unsubscribe(unsubscribe_handle);
        console.log(new Date(), "A client has disconnected, leaving", N, "subscriber(s).");
    });
});

// view engine setup. Set some values in the app settings table.
// See http://expressjs.com/4x/api.html#app.set
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/*
 * Set up express routes
 */
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', function (req, res, next) {
    console.log("New client get at /");
    res.render('index', {
        title: 'WeeRT'
    });
});

//app.get('/', function (req, res) {
//  res.sendfile(__dirname + '/index.html');
//});

var loop_packets;

var setup_mongo = function (callback) {
    var MongoClient = mongo.MongoClient;

    MongoClient.connect(mongo_url, function (err, db) {
        if (err) return callback(err);
        // Create a capped collection if it doesn't exist already
        db.listCollections({name: 'loop_packets'}).toArray(function (err, names) {
            if (err) return callback(err);
            if (names.length) {
                console.log("Collection loop_packets already exists");
            } else {
                db.createCollection("loop_packets", {capped: true, size: 1000000, max: 1800});
                console.log("Created collection loop_packets");
            }
        });
        // Get the collection and return it through the async callback
        db.collection('loop_packets', function (err, collection) {
            if (err) return callback(err);
            loop_packets = collection;
            // Signal that we are done and with no errors.
            callback(null);
        })
    });
};

var setup_routes = function (callback) {

    // RESTful interface that listens for incoming loop packets and then
    // stores them in the MongoDB database
    app.post('/api/loop', function (req, res) {
        // Get the packet out of the request body:
        var packet = req.body.packet;
        console.log("got packet timestamp", packet.dateTime);
        // Insert it into the database
        loop_packets.insert(packet, function (err, result) {
            if (err) {
                console.log("Unable to insert packet with timestamp", packet["dateTime"]);
                // Signal internal server error
                res.sendStatus(500);
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
        var stop = +req.query.stop;
        console.log("Request for packets with start, stop times of", start, stop);
        loop_packets.find({"dateTime": {$gte : start, $lte : stop}}).toArray(function (err, packet_array) {
            if (err) {
                console.log("Unable to satisfy request. Reason", err);
                res.sendStatus(400);
            } else {
                console.log("# of packets=", packet_array.length);
                res.send(JSON.stringify(packet_array));
            }
        });
    });
    // Signal that the callbacks are set up and with no errors
    callback(null);
};

// Setup mongo, then once it is up and running, set up the RESTful interfaces
async.series([
        setup_mongo,
        setup_routes
    ],
    function (err) {
        if (err) {
            console.log("Got error attempting to set up Mongo or the RESTful interfaces:", err);
            throw err;
        }
    }
);


