/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/**
 * StreamManagerFactory module
 * @module services/stream
 */

var debug   = require('debug')('weert:server');
var mongodb = require('mongodb');
var Promise = require('bluebird');

var dbtools = require('../dbtools');

/**
 * Factory that produces an interface to manage streams. The interface is dependent
 * on a database Promise, and some options.
 * @param dbPromise - A Promise to a database connection
 * @param options - A set of options for the database collections
 * @alias module:services/stream.StreamManagerFactory
 * @return {StreamManager}
 */
var StreamManagerFactory = function (dbPromise, options) {

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
            dbPromise
                .then(function (db) {
                    // This returns a promise
                    return db
                        .collection(options.streams.metadata_name, options.streams.options)
                        .insertOne(stream_metadata, {});
                })
                .then(function (result) {
                    var stream_final_metadata = result.ops[0];
                    return resolve(stream_final_metadata);
                })
                .catch(function (err) {
                    return reject(err);
                });
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
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        collection
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
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        // A bad _id will cause an exception. Be prepared to catch it
                        try {
                            var id_obj = new mongodb.ObjectID(streamID);
                        } catch (err) {
                            err.description = "Unable to form ObjectID for streamID of " + streamID;
                            return reject(err)
                        }
                        collection
                            .find({_id: {$eq: id_obj}})
                            .toArray()
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };


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
                    return db
                        .collection(collection_name, options.packets.options)
                        .insertOne(packet);
                })
                .then(function (result) {
                    var final_packet       = result.ops[0];
                    final_packet.timestamp = final_packet._id.getTime();
                    delete final_packet._id;
                    return resolve(final_packet);
                })
                .catch(function (err) {
                    return reject(err);
                });
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
                    db.collection(collection_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        dbtools
                            .findByTimestamp(collection, dbQuery)
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
                    db.collection(collection_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        dbtools
                            .calcAggregate(collection, obs_type, dbQuery)
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
                    db.collection(collection_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        dbtools
                            .findOneByTimestamp(collection, dbQuery)
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
                    db.collection(collection_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        collection
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
        insertOnePacket : insertOnePacket,
        findPackets     : findPackets,
        aggregatePackets: aggregatePackets,
        findOnePacket   : findOnePacket,
        deleteOnePacket : deleteOnePacket
    }
};

module.exports = StreamManagerFactory;