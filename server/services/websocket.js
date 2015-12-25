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

var SocketIOFactory = function (app) {

    var io = socket_io(app);

    //TODO: Not sure. This might have to go at module scope
    var clients = {};

    /*
     * Listen for any new, incoming websocket connections, then subscribe
     * them to all the known events.
     */
    io.on('connection', function (socket) {
        debug(new Date(), "A new client has connected");

        // Save the client's socket and event function here,
        // so we can unsubscribe later if/when he leaves
        clients[socket] = {};

        // Subscribe the client to the list of known events
        for (var i = 0; i < event_list.length; i++) {
            // Save the function that should be run when a new event arrives:
            clients[socket][event_list[i]] = function (data) {
                socket.emit(event_list[i], data);
            };
            // Now subscribe to the event. The passed function will be fired when the event arrives
            app.on(event_list[i], clients[socket][event_list[i]]);
        }

        socket.on('disconnect', function () {
            // Client has gone away. Unsubscribe him from all the events
            for (var i = 0; i < event_list.length; i++) {
                app.removeListener(event_list[i], clients[socket][event_list[i]]);
            }
            delete clients[socket];
            debug(Date.now(), "A client has disconnected, leaving",
                app.listenerCount(event_list[0]),
                "subscriber(s).");
        });

        socket.emit('news', {msg: 'You are connected to the WeeRT server'});

    });

    return io;
};

module.exports = SocketIOFactory;