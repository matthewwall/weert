var pubsub = require('./pubsub');
var mongo = require('mongodb');
var bodyParser = require('body-parser');
var path = require('path');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var port = process.env.PORT || 3000;

// view engine setup. Set some values in the app settings table.
// See http://expressjs.com/4x/api.html#app.set
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Express'
    });
});

//app.get('/', function (req, res) {
//  res.sendfile(__dirname + '/index.html');
//});

var ws_socket;

io.on('connection', function (socket) {
    console.log("got a connection");

    // subscribe to any new packets
    pubsub.subscribe('new_packet', function(packet){
        console.log("ready to emit packet", packet);
        socket.emit('packet', packet);
    });
    socket.emit('news', {hello: 'world'});
    socket.on('my other event', function (data) {
        console.log(data);
    });
});


var MongoClient = mongo.MongoClient;
var mongo_url = "mongodb://localhost:27017/wee_node";

var loop_packets;
MongoClient.connect(mongo_url, function (err, db) {
    if (err) throw err;
    // Create a capped collection if it doesn't exist already
    db.listCollections({name:'loop_packets'}).toArray(function(err,names){
        if (names.length){
            console.log("Collection loop_packets already exists");
        } else {
            db.createCollection("loop_packets", {capped:true, size:1000000, max:1800});
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
    console.log("Got packet", packet);
    // Insert it into the database
    loop_packets.insert(packet, function (err, result) {
        if (err) throw err;
    });
    res.send("SUCCESS");
    pubsub.publish('new_packet', packet);
    console.log("Sent packet");
});

