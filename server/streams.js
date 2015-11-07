"use strict";

var streams_metadata_options = {};
var streams_metadata_name = 'streams_metadata';

var dbtools = require('./dbtools');

var _getPacketCollectionName = function(streamID){
    return "streams_" + streamID + "_packets"
};

var StreamsManager = function (db, options) {
    this.db = db;
    this.options = options || {collection: {capped: true, size: 1000000, max: 3600}};
};

StreamsManager.prototype.findStreams = function (options, callback){
    "use strict";
    var self = this;
    var options_copy = dbtools.getOptions(options);
    var limit = options_copy.limit === undefined ? 0 : +options_copy.limit;
    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0){
        return callback({message:"Invalid value for 'limit': " + limit})
    }

    self.db.collection(streams_metadata_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        collection.find()
            .limit(limit)
            .sort(options_copy.sort)
            .toArray(callback);
    });
};

StreamsManager.prototype.createStream = function (stream_metadata, callback){
    "use strict";
    var self = this;
    // TODO: Check to see if the metadata has an _id field
    self.db.collection(streams_metadata_name, {strict: false}, function (err, collection){
        if (err) return callback(err);
        collection.insertOne(stream_metadata, {}, function (err, result){
            var stream_final_metadata = result.ops[0];
            console.log("insert stream result=", stream_final_metadata);
            return callback(err, stream_final_metadata);
        });
    });
};

StreamsManager.prototype.insertOne = function (streamID, in_packet, callback) {
    "use strict";
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
    "use strict";
    var self = this;
    var options_copy = dbtools.getOptions(options);
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        dbtools.findByTimestamp(collection, options_copy, function (err, result){
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

StreamsManager.prototype.findOne = function(streamID, options, callback){
    "use strict";
    var self = this;
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict:true}, function(err, collection){
        if (err) return callback(err);
        dbtools.findOneByTimestamp(collection, options, function (err, result){
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};


StreamsManager.prototype.aggregate = function (streamID, obs_type, options, callback) {
    "use strict";
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
