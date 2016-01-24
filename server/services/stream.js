/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
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
        var dbPromise = dbtools.createCollection(connectPromise,
            options.streams.metadata_name,
            options.streams.options);

        /**
         * Create a new stream
         * @method createStream
         * @param {object} stream_metadata - The stream's metadata
         * @returns {Promise}
         */
        var createStream = function (stream_metadata) {
            // Make sure the _id field has not been already defined. MongoDB will do this.
            if (stream_metadata._id !== undefined) {
                return new Promise.reject(new Error("Field _id is already defined"));
            }
            if (!stream_metadata.unit_group) {
                return new Promise.reject(new Error("Missing unit_group"));
            }
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name, options.streams.options)
                        .then(function (coln) {
                            return coln
                                .insertOne(stream_metadata)
                                .then(function (result) {
                                    // Get the final metadata
                                    var final_stream_metadata = result.ops[0];
                                    // Now create the collection that will hold the actual stream packets
                                    return db
                                        .createCollection(options.packets.name(final_stream_metadata._id), options.packets.options)
                                        .then(function () {
                                            return new Promise.resolve(final_stream_metadata);
                                        });
                                });
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
            // Make a copy of the query. We're going to modify it
            var findQuery = util._extend({}, dbQuery);
            // Remove limit and sort, which have their own functions
            delete findQuery.limit;
            delete findQuery.sort;

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db.options.streams.metadata_name, options.streams.options)
                        .then(function (coln) {
                            return coln
                                .find(findQuery)
                                .limit(dbQuery.limit)
                                .sort(dbQuery.sort)
                                .toArray();
                        });
                });
        };

        var findStream = function (streamID) {
            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(streamID);
            } catch (err) {
                err.description = "Unable to form ObjectID for streamID of " + streamID;
                return new Promise.reject(err)
            }
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name, options.streams.options)
                        .then(function (coln) {
                            return coln
                                .find({_id: {$eq: id_obj}})
                                .limit(1)
                                .toArray();
                        });
                });
        };


        var deleteOneStream = function (streamID) {
            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(streamID);
            } catch (err) {
                err.description = "Unable to form ObjectID for platformID of " + platformID;
                return new Promise.reject(err);
            }

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name, options.streams.options)
                        .then(function (coln) {
                            // First a promise to delete the metadata
                            var p1 = coln.deleteOne({_id: {$eq: id_obj}});
                            // Second a promise to delete the collection of stream packets
                            var p2 = db.dropCollection(options.packets.name(streamID));
                            // Return a promise to delete both
                            return Promise
                                .all([p1, p2])
                                .then(function (result) {
                                    return new Promise.resolve(result[0]);
                                });
                        });
                });
        };


        /**
         * Insert a new packet into an existing stream
         * @method insertOnePacket
         * @param {number} streamID - The ID of the stream in which to insert the packet
         * @param {object} packet - The packet
         */
        var insertOnePacket = function (streamID, packet) {
            // Make sure the incoming packet contains a timestamp
            if (packet.timestamp === undefined) {
                return new Promise.reject(new Error("No timestamp in packet"));
            }
            // Make sure it does not include an _id field:
            if (packet._id !== undefined) {
                return new Promise.reject(new Error("Field _id is already defined"));
            }
            // Change key timestamp to _id
            packet._id = new Date(packet.timestamp);
            delete packet.timestamp;

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID), options.packets.options)
                        .then(function (coln) {
                            return coln
                                .insertOne(packet)
                                .then(function (result) {
                                    var final_packet       = result.ops[0];
                                    final_packet.timestamp = final_packet._id.getTime();
                                    delete final_packet._id;
                                    return Promise.resolve(final_packet);
                                })
                        })
                        .catch(function () {
                            return new Promise.reject(new errors.NoSuchIDError("No such stream " + streamID));
                        })
                })
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
            // TODO: This could be relaxed a bit to allow other query predicates
            var start = dbQuery.start;
            var stop  = dbQuery.stop;
            var limit = dbQuery.limit;
            var sort  = dbQuery.sort;
            if (start === undefined) start = 0;
            if (stop === undefined) stop = new Date();
            if (limit === undefined) limit = 0;
            if (sort === undefined) sort = {_id: 1};

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID), options.streams.options)
                        .then(function (coln) {
                            return coln
                                .find({
                                    _id: {
                                        $gt : new Date(start),
                                        $lte: new Date(stop)
                                    }
                                })
                                .limit(limit)
                                .sort(sort)
                                .toArray();
                        })
                        .then(function (results) {
                            // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                            // instead of a Date() object:
                            for (var i = 0; i < results.length; i++) {
                                results[i].timestamp = results[i]._id.getTime();
                                delete results[i]._id;
                            }
                            return new Promise.resolve(results);
                        })
                });
        };

        var aggregatePackets = function (streamID, obs_type, dbQuery) {
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID), options.streams.options)
                        .then(function (coln) {
                            return dbtools
                                .calcAggregate(coln, obs_type, dbQuery)
                        });
                })
        };

        var findOnePacket = function (streamID, dbQuery) {
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID), options.streams.options)
                        .then(function (coln) {
                            return coln
                                .find(dbQuery.query)
                                .limit(1)
                                .sort(dbQuery.sort)
                                .toArray();
                        })
                        .then(function (results) {
                            // We are only interested in the single returned record
                            if (results.length < 1) {
                                // No matching timestamp. Return null.
                                return new Promise.resolve(null);
                            } else {
                                var record = results[0];
                                // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                                // instead of a Date() object:
                                record.timestamp = record._id.getTime();
                                delete record._id;
                                return new Promise.resolve(record);
                            }
                        })
                });
        };

        var deleteOnePacket = function (streamID, dbQuery) {
            var timestamp = +dbQuery.timestamp;
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID), options.streams.options)
                        .then(function (coln) {
                            return coln
                                .deleteOne({_id: {$eq: new Date(timestamp)}})
                        });
                })
        };

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
    }
    ;

module.exports = StreamManagerFactory;