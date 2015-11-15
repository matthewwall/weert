/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var util = require("util");
var EventEmitter = require("events");

function PacketEmitter() {
    EventEmitter.call(this);
}

util.inherits(PacketEmitter, EventEmitter);

PacketEmitter.prototype.newPacket = function(packet) {
    this.emit("dat", data);
}

var stream = new MyStream();

console.log(stream instanceof EventEmitter); // true
console.log(MyStream.super_ === EventEmitter); // true

stream.on("data", function(data) {
    console.log('Received data: "' + data + '"');
})
stream.write("It works!"); // Received data: "It works!"