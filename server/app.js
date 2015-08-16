var mongo_url = "mongodb://localhost:27017/wee_node";
var port = process.env.PORT || 3000;

// requires
var express = require('express');
var socket_io = require('socket.io');
var path = require('path');
var http = require('http');
var mongo = require('mongodb');
var bodyParser = require('body-parser');
var pubsub = require('./pubsub');

var server = http.createServer(app);
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

var app = express();
// view engine setup. Set some values in the app settings table.
// See http://expressjs.com/4x/api.html#app.set
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/*
 * Set up express routes
 */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res, next) {
    res.render('index', {
        title : 'Express',
        scriptlist : ['/socket.io/socket.io.js', 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js', 'javascripts/timeplot.js', 'javascripts/main.js']
    });
});

//app.get('/', function (req, res) {
//  res.sendfile(__dirname + '/index.html');
//});

/*
 * Set up connection to MongoDB
 */
var MongoClient = mongo.MongoClient;

// MongoDB collection holding the loop packets:
var loop_packets;

MongoClient.connect(mongo_url, function (err, db) {
    if (err) throw err;
    // Create a capped collection if it doesn't exist already
    db.listCollections({name: 'loop_packets'}).toArray(function (err, names) {
        if (names.length) {
            console.log("Collection loop_packets already exists");
        } else {
            db.createCollection("loop_packets", {capped: true, size: 1000000, max: 1800});
            console.log("Created collection loop_packets");
        }
    });
    db.collection('loop_packets', function (err, collection) {
        loop_packets = collection;
    })
});

// RESTful interface for storing loop packets into MongoDB
app.post('/api/loop', function (req, res) {
    // Get the packet out of the request body:
    var packet = req.body.packet;
    // Insert it into the database
    loop_packets.insert(packet, function (err, result) {
        if (err) throw err;
    });
    res.send("SUCCESS");

    // Now let any interested parties know there is a new packet:
    pubsub.publish('new_packet', packet, this);
});


/*
 * Set up WebSocket connection to any interested clients.
 */

var io = socket_io(server);
io.on('connection', function (socket) {

    // New client has connected. Subscribe him/her to any new packets
    unsubscribe_handle = pubsub.subscribe('new_packet', function (packet) {
        socket.emit('packet', packet);
    });

    socket.emit('news', {hello: 'world'});

    socket.on('my other event', function (data) {
        console.log(data);
    });

    socket.on('disconnect', function(){
        pubsub.unsubscribe(unsubscribe_handle);
    })
});
