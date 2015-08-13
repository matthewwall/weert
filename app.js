var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// view engine setup. Set some values in the app settings table.
// See http://expressjs.com/4x/api.html#app.set
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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

io.on('connection', function (socket) {
    console.log("got a connection");
    socket.emit('news', {hello: 'world'});
    socket.on('my other event', function (data) {
        console.log(data);
    });
});
