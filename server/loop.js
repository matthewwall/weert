"use strict";

var dbtools = require('./dbtools');

var LoopManager = function (db, options) {
    this.db = db;
    this.options = options || {collection: {capped: true, size: 1000000, max: 3600}};
};

LoopManager.prototype.insertOne = function (in_packet, callback) {
    var self = this;
    if (in_packet.instrument === undefined)
        return callback("Missing instrument ID");
    // Clone the packet, changing timestamp to _id, and not passing on the instrument name
    var packet = {};
    for (var k in in_packet) {
        if (in_packet.hasOwnProperty(k)) {
            if (k === 'timestamp') {
                packet["_id"] = new Date(in_packet[k]);
            } else {
                if (k !== 'instrument') {
                    packet[k] = in_packet[k];
                }
            }
        }
    }
    var collection_name = "loop_" + in_packet.instrument;
    // Create the collection if it doesn't exist already
    dbtools.createCollection(this.db, collection_name, self.options.collection, function (err, coln) {
        if (err) return callback(err);
        coln.insertOne(packet, null, function (err, result) {
            if (err) return callback(err);
            console.log("inserted packet with timestamp", packet._id);
            return callback(null, result);
        })
    });
};


LoopManager.prototype.find = function (start, stop, instrument, limit, callback) {
    var self = this;
    var collection_name = "loop_" + instrument;

    dbtools.find(self.db, collection_name, start, stop, limit, function (err, result){
        if (err) return callback(err);
        return callback(null, result);
    });
};

module.exports = {
    LoopManager: LoopManager
};
