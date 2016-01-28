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

var StreamManagerFactory = function (dbPromise, options) {

        // Create a promise to create the streams metadata collection. It will resolve to a MongoClient Promise,
        // which can be used by the other methods.
        //var dbPromise = dbtools.createCollection(connectPromise,
        //    options.streams.metadata_name,
        //    options.streams.options);

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
                        .collection(db, options.streams.metadata_name,
                            Object.assign(options.streams.options, {strict: false}))
                        .then(function (coln) {

                            var namePromise;
                            // If a name was given, make sure it's not already in the database
                            if (stream_metadata.name) {
                                namePromise = coln
                                    .find({name: {$eq: stream_metadata.name}})
                                    .toArray();
                            } else {
                                namePromise = new Promise.resolve([]);
                            }
                            return namePromise
                                .then(function (result) {
                                    if (result.length) {
                                        // Name already exists. Error.
                                        return new Promise.reject(new errors.DuplicateNameError("Platform name already exists"))
                                    } else {
                                        return coln
                                            .insertOne(stream_metadata)
                                            .then(function (result) {
                                                // Get the final metadata
                                                var final_stream_metadata = result.ops[0];
                                                // Now create the collection that will hold the actual stream packets
                                                return db
                                                    .createCollection(options.packets.name(final_stream_metadata._id),
                                                        options.packets.options)
                                                    .then(function () {
                                                        return new Promise.resolve(final_stream_metadata);
                                                    });
                                            });

                                    }
                                })

                        });
                });
        };

        var updateStream = function (streamID, stream_metadata) {

            // If the streamID was included in the metadata, make sure it matches
            // the one in the URL:
            if (stream_metadata._id && (streamID !== stream_metadata._id)) {
                return new Promise.reject(new Error({
                    message    : "Mismatch in streamID",
                    description: streamID + " vs " + stream_metadata._id
                }));
            }

            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(streamID);
            } catch (err) {
                err.description = "Unable to form ObjectID for streamID of " + streamID;
                return new Promise.reject(err);
            }

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name,
                            Object.assign(options.streams.options, {strict: false}))
                })
                .then(function (coln) {
                    var namePromise;
                    // You can change the name, but only to another unique name. So, if a name was specified,
                    // we need to make sure it is not already in the database
                    if (stream_metadata.name) {
                        // A name was given. Return a promise for all the streams potentially matching the name
                        namePromise = coln
                            .find({name: {$eq: stream_metadata.name}})
                            .toArray();

                    } else {
                        // No name was given, so no need to test for uniqueness.
                        // Create an already fulfilled promise, holding an empty array.
                        namePromise = new Promise.resolve([]);
                    }
                    return namePromise
                        .then(function (streams) {

                            if (streams.length) {
                                // Unfortunately, the name is already taken. Signal the error
                                return new Promise.reject(new errors.DuplicateNameError("Name" + stream_metadata.name + "already in use"))
                            }

                            // Make a copy of the metadata. We're going to modify it
                            var md = Object.assign({}, stream_metadata);
                            // Can't change the streamID, so delete it
                            delete md._id;

                            // Returns a promise to update the stream metadata
                            return coln
                                .updateOne({_id: {$eq: id_obj}}, {$set: md});
                        })
                })
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
            var findQuery = Object.assign({}, dbQuery);
            // Remove limit and sort, which have their own functions
            delete findQuery.limit;
            delete findQuery.sort;

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name,
                            Object.assign(options.streams.options, {strict: false}))
                        .then(function (coln) {
                            return coln
                                .find(findQuery)
                                .sort(dbQuery.sort)
                                .limit(dbQuery.limit)
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
                        .collection(db, options.streams.metadata_name,
                            Object.assign(options.streams.options, {strict: false}))
                        .then(function (coln) {
                            return coln
                                .find({_id: {$eq: id_obj}})
                                .limit(1)
                                .toArray();
                        });
                });
        };


        var deleteStream = function (streamID) {
            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(streamID);
            } catch (err) {
                err.description = "Unable to form ObjectID for streamID of " + streamID;
                return new Promise.reject(err);
            }

            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.streams.metadata_name,
                            Object.assign(options.streams.options, {strict: false}))
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
         * @method insertPacket
         * @param {number} streamID - The ID of the stream in which to insert the packet
         * @param {object} packet - The packet
         */
        var insertPacket = function (streamID, packet) {
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
                        .collection(db, options.packets.name(streamID),
                            Object.assign(options.streams.options, {strict: true}))
                        .then(function (coln) {
                            return coln
                                .find({
                                    _id: {
                                        $gt : new Date(start),
                                        $lte: new Date(stop)
                                    }
                                })
                                .sort(sort)
                                .limit(limit)
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
                        .collection(db, options.packets.name(streamID),
                            Object.assign(options.streams.options, {strict: true}))
                        .then(function (coln) {
                            // This wil return a promise to calculate the aggregate:
                            return dbtools
                                .calcAggregate(coln, obs_type, dbQuery)
                        });
                })
        };

        var findPacket = function (streamID, dbQuery) {
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID),
                            // Set strict=true to force error if streamID does not exist
                            Object.assign(options.streams.options, {strict: true}))
                        .then(function (coln) {
                            return coln
                                .find(dbQuery.query)
                                .sort(dbQuery.sort)
                                .limit(1)
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

        var deletePacket = function (streamID, dbQuery) {
            var timestamp = +dbQuery.timestamp;
            return dbPromise
                .then(function (db) {
                    return dbtools
                        .collection(db, options.packets.name(streamID),
                            Object.assign(options.streams.options, {strict: true}))
                        .then(function (coln) {
                            return coln
                                .deleteOne({_id: {$eq: new Date(timestamp)}})
                        });
                })
        };

        return {
            createStream    : createStream,
            updateStream    : updateStream,
            findStreams     : findStreams,
            findStream      : findStream,
            deleteStream    : deleteStream,
            insertPacket    : insertPacket,
            findPackets     : findPackets,
            aggregatePackets: aggregatePackets,
            findPacket      : findPacket,
            deletePacket    : deletePacket
        }
    }
    ;

module.exports = StreamManagerFactory;