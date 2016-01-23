/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/**
 * PlatformManagerFactory module
 * @module services/platform
 */

var debug   = require('debug')('weert:server');
var mongodb = require('mongodb');
var Promise = require('bluebird');
var util    = require('util');

var dbtools = require('../dbtools');
var stream  = require('./stream');
var errors  = require('../errors');

/**
 * Factory that produces an interface to manage platforms. The interface is dependent
 * on a database Promise, and some options.
 * @param dbPromise - A Promise to a database connection
 * @param options - A set of options for the database collections
 * @param streamManager - An instance of a streamManager
 * @alias module:services/platform.PlatformManagerFactory
 * @return {PlatformManager}
 */
var PlatformManagerFactory = function (dbPromise, options, streamManager) {

    /**
     * Create a new platform
     * @method createPlatform
     * @param {object} platform_metadata - The platform's metadata
     * @returns {Promise}
     */
    var createPlatform = function (platform_metadata) {

        return new Promise(function (resolve, reject) {

            // Make sure the _id field has not been already defined. MongoDB will do this.
            if (platform_metadata._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }

            // Extract a database object out of the promise
            dbPromise
                .then(function (db) {
                    var namePromise;
                    // Platform names must be unique. If a name was given, check to make sure it's unique
                    if (platform_metadata.name) {
                        // A name was given. Create a promise to hit the database
                        namePromise = new Promise(function (res1, rej1) {
                            db.collection(options.platforms.metadata_name,
                                options.platforms.options,
                                function (err, coln) {
                                    coln
                                        .find({name: {$eq: platform_metadata.name}})
                                        .toArray()
                                        .then(res1)
                                        .catch(rej1);
                                });
                        })
                    } else {
                        // No name was given, so no need to test for uniqueness.
                        // Create an already fulfilled promise, holding an empty array.
                        namePromise = new Promise.resolve([]);
                    }
                    namePromise
                        .then(function (result) {
                            if (result.length) {
                                // Name already exists. Error.
                                return reject(new errors.DuplicateNameError("Platform name already exists"))
                            } else {
                                // Name was either not given, or it's unique, so we're OK.
                                // See if a stream to hold the locations has been given.
                                var locationPromise;
                                if (!platform_metadata.location) {
                                    // The platform location stream is undefined. Get a Promise to create one
                                    locationPromise = streamManager.createStream({
                                        description: "Locations stream",
                                        unit_group : "METRIC"
                                    });
                                } else {
                                    // The location stream already exists. Create a fulfilled promise of 'undefined'.
                                    locationPromise = new Promise.resolve(undefined);
                                }
                                locationPromise.then(function (results) {
                                    if (results) {
                                        // We've got a freshly allocated stream. Record its ID in the metadata
                                        platform_metadata.location = results._id;
                                    }
                                    // Finally, insert the metadata into the database
                                    db
                                        .collection(options.platforms.metadata_name,
                                            options.platforms.options,
                                            function (err, coln) {
                                                coln
                                                    .insertOne(platform_metadata)
                                                    .then(function (results) {
                                                        return resolve(results.ops[0])
                                                    })
                                                    .catch(reject);
                                            })
                                })
                            }
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    };


    var updateOnePlatform = function (platformID, platform_metadata) {
        return new Promise(function (resolve, reject) {

            // If the platformID was included in the metadata, make sure it matches
            // the one in the URL:
            if (platform_metadata._id && (platformID !== platform_metadata._id)) {
                return reject(new Error({
                    message    : "Mismatch in platformID",
                    description: platformID + " vs " + platform_metadata._id
                }));
            }

            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(platformID);
            } catch (err) {
                err.description = "Unable to form ObjectID for platformID of " + platformID;
                return reject(err);
            }

            var platform_collection_name = options.platforms.metadata_name;

            dbPromise
                .then(function (db) {
                    db.collection(platform_collection_name, {strict: true}, function (err, coln) {
                        if (err)
                            return reject(err);
                        // Make a copy of the metadata. We're going to modify it
                        var md = util._extend({}, platform_metadata);
                        // The save method does not overwrite the locations data, so delete it.
                        delete md.location;
                        delete md._id;

                        coln
                            .updateOne({_id: {$eq: id_obj}}, {$set: md})
                            .then(resolve)
                            .catch(reject);
                    });
                });
        });
    };


    /**
     * Delete a specific platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform to delete
     * @returns {bluebird|exports|module.exports}
     */
    var deleteOnePlatform = function (platformID) {
        return new Promise(function (resolve, reject) {

            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(platformID);
            } catch (err) {
                err.description = "Unable to form ObjectID for platformID of " + platformID;
                return reject(err);
            }

            dbPromise
                .then(function (db) {
                    var platform_collection_name = options.platforms.metadata_name;

                    // Open up the metadata collection
                    db
                        .collection(platform_collection_name, {strict: true}, function (err, coln) {
                            if (err) {
                                // The metadata coln doesn't exist. That's OK, because our goal is to
                                // delete the platform, so our mission is accomplished.
                                return resolve({result: {ok: 1, n: 0}});
                            }
                            // Hit the database to get the ID of the location stream
                            coln
                                .find({_id: {$eq: platformID}})
                                .toArray()
                                .then(function (result) {
                                    if (result.length === 0) {
                                        // Platform not found. We're done.
                                        return resolve({result: {ok: 1, n: 0}})
                                    }

                                    var location_streamID = result[0].location;

                                    // First, a promise to delete the platform metadata from the metadata collection
                                    var p1 = coln.deleteOne({_id: {$eq: id_obj}});
                                    // Then a promise to delete the location stream
                                    var p2 = streamManager.deleteOneStream(location_streamID);

                                    // Resolve both promises, using Promise.all.
                                    Promise
                                        .all([p1, p2])
                                        .then(function (result) {
                                            return resolve(result[0].result);
                                        })
                                        .catch(function (err) {
                                            return resolve({result: {ok: 1, n: 0}});
                                        });
                                })
                                .catch(reject);
                        })
                })
                .catch(reject);
        });
    };

    /**
     * Find all platforms
     * @method findPlatforms
     * @param {object} dbQuery - Hash of query options
     * @param {object} [dbQuery.sort={_id:1} - Mongo sort option.
     * @param {number} [dbQuery.limit] - The number of locrecs to return. If missing, return them all.
     * @returns {Promise}
     */
    var findPlatforms = function (dbQuery) {

        // Make a copy of the query. We're going to modify it
        var findQuery = util._extend({}, dbQuery);
        delete findQuery.limit;
        delete findQuery.sort;

        return new Promise(function (resolve, reject) {
            dbPromise
                .then(function (db) {
                    db.collection(options.platforms.metadata_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        coln
                            .find(findQuery)
                            .limit(dbQuery.limit)
                            .sort(dbQuery.sort)
                            .toArray()
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        })
    };

    var findPlatform = function (platformID) {
        return new Promise(function (resolve, reject) {
            // A bad _id will cause an exception. Be prepared to catch it
            try {
                var id_obj = new mongodb.ObjectID(platformID);
            } catch (err) {
                err.description = "Unable to form ObjectID for platformID of " + platformID;
                return reject(err)
            }
            dbPromise
                .then(function (db) {
                    db.collection(options.platforms.metadata_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
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


    /**
     * Insert a new location packet for an existing platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform in which to insert the locrec
     * @param {object} locrec - The locrec
     */
    var insertOneLocation = function (platformID, locrec) {

        return new Promise(function (resolve, reject) {

            dbPromise
                .then(function (db) {
                    var platform_collection_name = options.platforms.metadata_name;

                    // Open up the metadata collection
                    db
                        .collection(platform_collection_name, {strict: true}, function (err, coln) {
                            if (err) reject(err);

                            // Hit the database to get the ID of the location stream
                            coln
                                .find({_id: {$eq: platformID}})
                                .toArray()
                                .then(function (result) {
                                    if (result.length === 0) {
                                        // Platform not found. We're done.

                                    }

                                    var location_streamID = result[0].location;

                                    streamManager
                                        .insertOnePacket(location_streamID, locrec)
                                    stopped
                                    here
                                })
                                .catch(reject);
                        })

                })
                .catch(reject);


            // Make sure the incoming locrec contains a timestamp
            if (locrec.timestamp === undefined) {
                return reject(new Error("No timestamp in location record"));
            }
            // Make sure it does not include an _id field:
            if (locrec._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }
            // Change key timestamp to _id
            locrec._id = new Date(locrec.timestamp);
            delete locrec.timestamp;
            // Get the name of the Mongo collection the locrec should go in
            var collection_name = options.locrecs.name(platformID);
            dbPromise
                .then(function (db) {
                    return db
                        .collection(collection_name, options.locrecs.options)
                        .insertOne(locrec);
                })
                .then(function (result) {
                    var final_locrec       = result.ops[0];
                    final_locrec.timestamp = final_locrec._id.getTime();
                    delete final_locrec._id;
                    return resolve(final_locrec);
                })
                .catch(function (err) {
                    return reject(err);
                });
        });
    };


    /**
     * Find all locrecs satifying a query
     * @method findPackets
     * @param {number} platformID - The ID of the platform with the locrecs to query
     * @param {object} dbQuery - Hash of query options
     * @param {number} [dbQuery.start] - Timestamps greater than this value
     * @param {number} [dbQuery.stop] - Timestamps less than or equal to this value
     * @param {object} [dbQuery.sort={_id:1} - Mongo sort option.
     * @param {number} [dbQuery.limit] - The number of locrecs to return. If missing, return them all.
     * @returns {Promise}
     */
    var findLocations = function (platformID, dbQuery) {
        return new Promise(function (resolve, reject) {
            // Get the name of the Mongo collection from the platformID
            var collection_name = options.locrecs.name(platformID);
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

    var findOneLocation = function (platformID, dbQuery) {
        return new Promise(function (resolve, reject) {
            var collection_name = options.locrecs.name(platformID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, coln) {
                        if (err) return reject(err);
                        dbtools
                            .findOneByTimestamp(coln, dbQuery)
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    };

    var deleteOneLocation = function (platformID, dbQuery) {
        return new Promise(function (resolve, reject) {
            var timestamp       = +dbQuery.timestamp;
            var collection_name = options.locrecs.name(platformID);
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
     * @typedef PlatformManager
     * @property {function} createPlatform - Create a new platform
     */
    return {
        createPlatform   : createPlatform,
        updateOnePlatform: updateOnePlatform,
        deleteOnePlatform: deleteOnePlatform,
        findPlatforms    : findPlatforms,
        findPlatform     : findPlatform,
        insertOneLocation: insertOneLocation,
        findLocations    : findLocations,
        findOneLocation  : findOneLocation,
        deleteOneLocation: deleteOneLocation
    }
};

module.exports = PlatformManagerFactory;