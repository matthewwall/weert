/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var streams_metadata_name = 'streams_metadata';

var mongodb = require('mongodb');
var debug   = require('debug')('weert:server');

var dbtools = require('./dbtools');

var _getPacketCollectionName = function (streamID) {
    return "streams_" + streamID + "_packets"
};

var StreamsManager = function (db, options) {
    this.db      = db;
    this.options = options || {packets_collection: {capped: true, size: 1000000, max: 3600}};
};

StreamsManager.prototype.createStream = function (stream_metadata, callback) {
    var self = this;

    // Make sure the _id field has not been already defined. This is MongoDB's job
    if (stream_metadata._id !== undefined) {
        return callback(new Error("Field _id is already defined"));
    }
    self.db.collection(streams_metadata_name, {strict: false}, function (err, collection) {
        if (err) return callback(err);
        collection.insertOne(stream_metadata, {}, function (err, result) {
            if (result.ops === undefined) {
                return callback(new Error("Internal error creating stream"))
            }
            var stream_final_metadata = result.ops[0];
            return callback(err, stream_final_metadata);
        });
    });
};

StreamsManager.prototype.findStreams = function (options, callback) {
    var self = this;
    // A bad sort direction can cause an exception to be raised:
    try {
        options = dbtools.getOptions(options);
    }
    catch (err) {
        err.description = options;
        return callback(err)
    }
    var limit = options.limit === undefined ? 0 : +options.limit;
    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0) {
        return callback(new Error("Invalid value for limit: " + limit))
    }

    self.db.collection(streams_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.find()
            .limit(limit)
            .sort(options.sort)
            .toArray(callback);
    });
};

StreamsManager.prototype.findStream = function (streamID, callback) {
    var self = this;

    self.db.collection(streams_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        // A bad _id will cause an exception. Be prepared to catch it
        try {
            var id_obj = new mongodb.ObjectID(streamID);
        } catch (err) {
            err.description = "Unable to form ObjectID for streamID of " + streamID;
            return callback(err)
        }
        collection.find(
            {
                _id: {$eq: id_obj}
            }
            )
            .toArray(callback);
    });
};

StreamsManager.prototype.insertOne = function (streamID, in_packet, callback) {
    var self = this;
    // Make sure the incoming packet contains a timestamp
    if (in_packet.timestamp === undefined) {
        return callback(new Error("No timestamp in packet"));
    }
    // Make sure it does not include an _id field:
    if (in_packet._id !== undefined) {
        return callback(new Error("Field _id is already defined"));
        return callback(err);
    }
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
    // Open up the collection. It will be created if it doesn't exist already
    // TODO: Optionally require that the collection exist before allowing insertions
    self.db.collection(collection_name, self.options.packets_collection, function (err, coln) {
        if (err) return callback(err);
        coln.insertOne(packet, null, function (err, result) {
            if (err) return callback(err);
            debug("inserted packet with timestamp", packet._id);
            return callback(null, result);
        })
    });
};

StreamsManager.prototype.find = function (streamID, options, callback) {
    var self = this;
    // A bad sort direction can cause an exception to be raised:
    try {
        options = dbtools.getOptions(options);
    }
    catch (err) {
        return callback(err)
    }
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        dbtools.findByTimestamp(collection, options, function (err, result) {
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

StreamsManager.prototype.findOne = function (streamID, options, callback) {
    var self            = this;
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        dbtools.findOneByTimestamp(collection, options, function (err, result) {
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

StreamsManager.prototype.deleteOne = function (streamID, options, callback) {
    var self      = this;
    var timestamp = +options.timestamp;
    // Test to make sure 'timestamp' is a number
    if (typeof timestamp !== 'number' || (timestamp % 1) !== 0) {
        return callback(new Error("Invalid value for 'timestamp': " + timestamp));
    }
    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.deleteOne(
            {
                _id: {
                    $eq: new Date(timestamp)
                }
            },
            {},
            callback
        )
    });
};


StreamsManager.prototype.aggregate = function (streamID, obs_type, options, callback) {
    var self = this;

    var collection_name = _getPacketCollectionName(streamID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        dbtools.calcAggregate(collection, obs_type, options, function (err, result) {
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};

module.exports = {
    StreamsManager: StreamsManager
};
