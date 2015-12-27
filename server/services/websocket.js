/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var debug     = require('debug')('weert:server');
var socket_io = require('socket.io');

var event_list = [
    'platforms/POST',
    'platforms/locations/POST',
    'platforms/locations/DELETE',
    'streams/POST',
    'streams/packets/POST',
    'streams/packets/DELETE'
];

var SocketIOFactory = function (http, app) {

    var io = socket_io(http);

    // Function for registering a socket for an event.
    var regEvent = function(socket, event){
        var f = function(data){
            socket.emit(event, data);
        };
        app.on(event, f);
        return f;
    };

    /*
     * Listen for any new, incoming websocket connections, then subscribe
     * them to events.
     */
    io.on('connection', function (socket) {
        debug(new Date(), "A new client has connected");

        var unsubscribe_handle = regEvent(socket, 'streams/packets/POST');

        socket.on('disconnect', function () {
            app.removeListener('streams/packets/POST', unsubscribe_handle);
            debug(Date.now(), "A client has disconnected, leaving",
                app.listenerCount('streams/packets/POST'), "subscriber(s)");
        });

        socket.emit('news', {msg: 'You are connected to the WeeRT server'});

    });

    return io;
};

module.exports = SocketIOFactory;