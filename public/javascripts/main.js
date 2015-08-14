// Construct the websocket url back to the original host
var ws_url = "ws://" + window.location.host;

// Open up a websocket:
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {my: 'data'});
});

socket.on('packet', function (data) {
    console.log("Got packet", data);
});
