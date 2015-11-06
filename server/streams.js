"use strict";

var dbtools = require('./dbtools');

var _getPacketCollectionName = function(streamID){
    return "streams_" + streamID + "_packets"
};

var StreamsManager = function (db, options) {
    this.db = db;
    this.options = options || {collection: {capped: true, size: 1000000, max: 3600}};
};

//StreamsManager.prototype.newStream = function(metadata){
//    var self = this;
//    dbtools.createCollection(self.db, "streams_metadata", {}, function (err, collection){
//        collection.insertOne(...)
//    });
//};

StreamsManager.prototype.insertOne = function (streamID, in_packet, callback) {
    var self = this;
    if (streamID === undefined)
        return callback("Missing stream ID");
    // Clone the packet, changing timestamp to _id
    var packet = {};
    for (var k in in_packet) {
        if (in_packet.hasOwnProperty(k)) {
            if (k === 'timestamp') {
                packet["_id"] = new Date(in_packet[k]);
            } else {
                packet[k] = in_packet[k];
            }
        }
    }
    var collection_name = _getPacketCollectionName(streamID);
    // Create the collection if it doesn't exist already
    self.db.createCollection(collection_name, self.options.collection, function (err, coln) {
        if (err) return callback(err);
        coln.insertOne(packet, null, function (err, result) {
            if (err) return callback(err);
            console.log("inserted packet with timestamp", packet._id);
            return callback(null, result);
        })
    });
};

StreamsManager.prototype.find = function (streamID, options, callback) {
    var self = this;
    // Clone the options object because we will be modifying it:
    var options_copy = {};
    for (var attr in options) {
        if (options.hasOwnProperty(attr))
            options_copy[attr] = options[attr];
    }
    options_copy.sort = dbtools.getSortSpec(options.sort);
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        dbtools.find(collection, options_copy, function (err, result){
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

StreamsManager.prototype.findOne = function(streamID, options, callback){
    var self = this;
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        dbtools.findOne(collection, options, function (err, result){
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};


StreamsManager.prototype.aggregate = function (streamID, obs_type, options, callback) {
    var self = this;

    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        dbtools.calcAggregate(collection, obs_type, options, function (err, result){
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

module.exports = {
    StreamsManager: StreamsManager
};
