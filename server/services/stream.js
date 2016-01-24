/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/**
 * StreamManagerFactory module
 * @module services/stream
 */

var debug   = require('debug')('weert:server');
var mongodb = require('mongodb');
var Promise = require('bluebird');

var dbtools = require('../dbtools');
var errors  = require('../errors');

var StreamManagerFactory = function (connectPromise, options) {

    // Create a promise to create the streams metadata collection. It will resolve to a MongoClient Promise,
    // which can be used by the other methods.
    var dbPromise = dbtools.promiseACollection(connectPromise,
        options.streams.metadata_name,
        options.streams.options);

    /**
     * Create a new stream
     * @method createStream
     * @param {object} stream_metadata - The stream's metadata
     * @returns {Promise}
     */
    var createStream = function (stream_metadata) {
        return new Promise(function (resolve, reject) {
            // Make sure the _id field has not been already defined. MongoDB will do this.
            if (stream_metadata._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }
            if (!stream_metadata.unit_group) {
                return reject(new Error("Missing unit_group"));
            }
            dbPromise
                .then(function (db) {
                    db
                        .collection(options.streams.metadata_name, options.streams.options, function (err, coln) {
                            if (err) return reject(err);
                            coln
                                .insertOne(stream_metadata)
                                .then(function (result) {
                                    // Get the final metadata, and the streamID
                                    var stream_final_metadata = result.ops[0];
                                    var streamID              = stream_final_metadata._id;
                                    // Now create the collection that will hold the actual stream packets
                                    db
                                        .createCollection(options.packets.name(streamID), options.packets.options)
                                        .then(function () {
                                            return resolve(stream_final_metadata);
                                        })
                                        .catch(reject);
                                })
                                .catch(reject);
                        });
                })
                .catch(reject);
        });
    };


    /**
     * Find all streams
     * @method findStreams
     * @param {object} dbQuery - Hash of query options
     * @param {object} [dbQuery.sort={_id:1} - Mongo sort option.
     * @param {number} [dbQuery.limit] - The number of packets to return. If missing, return them all.
     * @returns {Promise}
     */
    var findStreams = function (dbQuery) {
        return new Promise(function (resolve, reject) {
            dbPromise
                .then(function (db) {
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        coln
                            .find()
                            .limit(dbQuery.limit)
                            .sort(dbQuery.sort)
                            .toArray()
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };

    var findStream = function (streamID) {
        return new Promise(function (resolve, reject) {
            dbPromise
                .then(function (db) {
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        // A bad _id will cause an exception. Be prepared to catch it
                        try {
                            var id_obj = new mongodb.ObjectID(streamID);
                        } catch (err) {
                            err.description = "Unable to form ObjectID for streamID of " + streamID;
                            return reject(err)
                        }
                        coln
                            .find({_id: {$eq: id_obj}})
                            .toArray()
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };


    var deleteOneStream = function (streamID) {
        return new Promise(function (resolve, reject) {
            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(streamID);
            } catch (err) {
                err.description = "Unable to form ObjectID for platformID of " + platformID;
                return reject(err);
            }

            dbPromise
                .then(function (db) {
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, coln) {
                        if (err) {
                            // The metadata collection doesn't exist. That's OK, because our goal is to
                            // delete the stream, so our mission is accomplished.
                            return resolve({ok: 1, n: 0});
                        }
                        // First a promise to delete the metadata
                        var p1 = coln.deleteOne({_id: {$eq: streamID}}, {});
                        // Second a promise to delete the collection of stream packets
                        var p2 = db.dropCollection(options.packets.name(streamID));
                        Promise
                            .all([p1, p2])
                            .then(function(result){
                                return resolve(result[0]);
                            })
                            .catch(reject);
                    });
                })
                .catch(reject);
        })
    }


    /**
     * Insert a new packet into an existing stream
     * @method insertOnePacket
     * @param {number} streamID - The ID of the stream in which to insert the packet
     * @param {object} packet - The packet
     */
    var insertOnePacket = function (streamID, packet) {
        return new Promise(function (resolve, reject) {
            // Make sure the incoming packet contains a timestamp
            if (packet.timestamp === undefined) {
                return reject(new Error("No timestamp in packet"));
            }
            // Make sure it does not include an _id field:
            if (packet._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }
            // Change key timestamp to _id
            packet._id = new Date(packet.timestamp);
            delete packet.timestamp;
            // Get the name of the Mongo collection the packet should go in
            var collection_name = options.packets.name(streamID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, options.packets.options, function (err, coln) {
                        if (err)
                            return reject(new errors.NoSuchIDError("Non existent stream " + streamID));
                        coln
                            .insertOne(packet)
                            .then(function (result) {
                                var final_packet       = result.ops[0];
                                final_packet.timestamp = final_packet._id.getTime();
                                delete final_packet._id;
                                return resolve(final_packet);
                            })
                            .catch(reject);
                    })
                })
                .catch(reject);
        });
    };


    /**
     * Find all packets satifying a query
     * @method findPackets
     * @param {number} streamID - The ID of the stream with the packets to query
     * @param {object} dbQuery - Hash of query options
     * @param {number} [dbQuery.start] - Timestamps greater than this value
     * @param {number} [dbQuery.stop] - Timestamps less than or equal to this value
     * @param {object} [dbQuery.sort={_id:1} - Mongo sort option.
     * @param {number} [dbQuery.limit] - The number of packets to return. If missing, return them all.
     * @returns {Promise}
     */
    var findPackets = function (streamID, dbQuery) {
        return new Promise(function (resolve, reject) {
            // Get the name of the Mongo collection from the streamID
            var collection_name = options.packets.name(streamID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        dbtools
                            .findByTimestamp(coln, dbQuery)
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };

    var aggregatePackets = function (streamID, obs_type, dbQuery) {
        return new Promise(function (resolve, reject) {
            var collection_name = options.packets.name(streamID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        dbtools
                            .calcAggregate(coln, obs_type, dbQuery)
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };

    var findOnePacket = function (streamID, dbQuery) {
        return new Promise(function (resolve, reject) {
            var collection_name = options.packets.name(streamID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        dbtools
                            .findOneByTimestamp(coln, dbQuery)
                            .then(resolve)
                            .catch(reject)
                    });
                })
                .catch(reject);
        });
    };

    var deleteOnePacket = function (streamID, dbQuery) {
        return new Promise(function (resolve, reject) {
            var timestamp       = +dbQuery.timestamp;
            var collection_name = options.packets.name(streamID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        coln
                            .deleteOne({_id: {$eq: new Date(timestamp)}}, {})
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };

    /**
     * @typedef StreamManager
     * @property {function} createStream - Create a new stream
     */
    return {
        createStream    : createStream,
        findStreams     : findStreams,
        findStream      : findStream,
        deleteOneStream : deleteOneStream,
        insertOnePacket : insertOnePacket,
        findPackets     : findPackets,
        aggregatePackets: aggregatePackets,
        findOnePacket   : findOnePacket,
        deleteOnePacket : deleteOnePacket
    }
};

module.exports = StreamManagerFactory;