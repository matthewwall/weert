/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
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
 */
var PlatformManagerFactory = function (connectPromise, options, streamManager) {

    // Create a promise to create the platform metadata collection. It will resolve to a MongoClient Promise,
    // which can be used by the other methods.
    var dbPromise = dbtools.createCollection(connectPromise, options.platforms.metadata_name, options.platforms.options);

    /**
     * Create a new platform
     * @method createPlatform
     * @param {object} platform_metadata - The platform's metadata
     * @returns {Promise}
     */
    var createPlatform = function (platform_metadata) {

        // Make sure the _id field has not been already defined. This is MongoDB's job
        if (platform_metadata._id !== undefined) {
            return new Promise.reject(new Error("Field _id is already defined"));
        }

        return dbPromise
            .then(function (db) {
                var namePromise;
                // Platform names must be unique. If a name was given, check the database to see if already exists.
                if (platform_metadata.name) {
                    // A name was given. Hit the database
                    namePromise = dbtools.collection(db, options.platforms.metadata_name, options.platforms.options)
                        .then(function (coln) {
                            // Returns a promise to resolve to an array, possibly containing the name
                            return coln
                                .find({name: {$eq: platform_metadata.name}})
                                .toArray();
                        })
                } else {
                    // No name was given, so no need to test for uniqueness.
                    // Create an already fulfilled promise, holding an empty array.
                    namePromise = new Promise.resolve([]);
                }
                return namePromise
                    .then(function (result) {
                        if (result.length) {
                            // Name already exists. Error.
                            return new Promise.reject(new errors.DuplicateNameError("Platform name already exists"))
                        } else {
                            // Name was either not given, or it's unique, so we're OK.
                            // See if a stream to hold the locations has been given.
                            if (!platform_metadata.location) {
                                // The platform location stream is undefined. Return a Promise to create one
                                return streamManager.createStream({
                                    description: "Locations stream",
                                    unit_group : "METRIC"
                                });
                            } else {
                                // The location stream already exists. Return a fulfilled promise of 'undefined'.
                                return new Promise.resolve(undefined);
                            }
                        }
                    })
                    .then(function (results) {
                        // If results are defined, it holds the metadata of a new location stream
                        if (results) {
                            // We've got a freshly allocated stream. Record its ID in the platform metadata
                            platform_metadata.location = results._id;
                        }

                        // Return a promise to insert the metadata
                        return dbtools
                            .collection(db, options.platforms.metadata_name, options.platforms.options)
                            .then(function (coln) {
                                return coln
                                    .insertOne(platform_metadata)
                                    .then(function (results) {
                                        return new Promise.resolve(results.ops[0])
                                    });
                            })
                    })
            })
    };


    var updateOnePlatform = function (platformID, platform_metadata) {

        // If the platformID was included in the metadata, make sure it matches
        // the one in the URL:
        if (platform_metadata._id && (platformID !== platform_metadata._id)) {
            return new Promise.reject(new Error({
                message    : "Mismatch in platformID",
                description: platformID + " vs " + platform_metadata._id
            }));
        }

        // A bad _id will cause an exception. Be prepared to catch it
        try {
            var id_obj = new mongodb.ObjectID(platformID);
        } catch (err) {
            err.description = "Unable to form ObjectID for platformID of " + platformID;
            return new Promise.reject(err);
        }

        // This will return a promise
        return dbPromise
            .then(function (db) {
                // This will return a promise
                return dbtools
                    .collection(db, options.platforms.metadata_name, options.platforms.options)
                    .then(function (coln) {
                        // Make a copy of the metadata. We're going to modify it
                        var md = util._extend({}, platform_metadata);
                        // The save method does not overwrite the locations data, , and you can't change
                        // the platformID, so delete them.
                        delete md.location;
                        delete md._id;

                        // Returns a promise
                        return coln
                            .updateOne({_id: {$eq: id_obj}}, {$set: md});
                    })
            });
    };


    /**
     * Delete a specific platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform to delete
     * @returns {bluebird|exports|module.exports}
     */
    var deleteOnePlatform = function (platformID) {
        // A bad _id will cause an exception. Be prepared to catch it
        try {
            var id_obj = new mongodb.ObjectID(platformID);
        } catch (err) {
            err.description = "Unable to form ObjectID for platformID of " + platformID;
            return new Promise.reject(err);
        }

        return dbPromise
            .then(function (db) {

                return dbtools
                    .collection(db, options.platforms.metadata_name, options.platforms.options)
                    .then(function (coln) {
                        // Hit the database to get the metadata of the platform
                        return coln
                            .find({_id: {$eq: platformID}})
                            .toArray()
                            .then(function (result) {
                                if (result.length === 0) {
                                    // Platform not found. We're done.
                                    return new Promise.resolve({result: {ok: 1, n: 0}})
                                }

                                // Got the metadata of the platform. Get the ID of the location stream out of it.
                                var location_streamID = result[0].location;

                                // First, a promise to delete the platform metadata from the metadata collection
                                var p1 = coln.deleteOne({_id: {$eq: id_obj}});
                                // Then a promise to delete the location stream
                                var p2 = streamManager.deleteOneStream(location_streamID);

                                // Resolve both promises, using Promise.all.
                                return Promise
                                    .all([p1, p2])
                                    .then(function (result) {
                                        return new Promise.resolve(result[0].result);
                                    })
                                    .catch(function () {
                                        return new Promise.resolve({result: {ok: 1, n: 0}});
                                    });
                            })
                    })
            })
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
        // Remove limit and sort, which have their own functions
        delete findQuery.limit;
        delete findQuery.sort;

        return dbPromise
            .then(function (db) {
                return dbtools
                    .collection(db, options.platforms.metadata_name, options.platforms.options)
                    .then(function (coln) {
                        return coln
                            .find(findQuery)
                            .limit(dbQuery.limit)
                            .sort(dbQuery.sort)
                            .toArray();
                    });
            })
    };

    var findPlatform = function (platformID) {
        // A bad _id will cause an exception. Be prepared to catch it
        try {
            var id_obj = new mongodb.ObjectID(platformID);
        } catch (err) {
            err.description = "Unable to form ObjectID for platformID of " + platformID;
            return new Promise.reject(err)
        }
        return dbPromise
            .then(function (db) {
                return dbtools
                    .collection(db, options.platforms.metadata_name, options.platforms.options)
                    .then(function (coln) {
                        return coln
                            .find({_id: {$eq: id_obj}})
                            .limit(1)
                            .toArray();
                    });
            })
    };


    // Returns a promise for the streamID of the locations stream
    var _getLocationStreamID = function (db, platformID) {

        // Open up the metadata collection to get the streamID of the location stream
        return dbtools
            .collection(db, options.platforms.metadata_name, options.platforms.options)
            .then(function (coln) {
                // Hit the database to get the ID of the location stream
                return coln
                    .find({_id: {$eq: platformID}})
                    .limit(1)
                    .toArray()
                    .then(function (result) {
                        if (result.length) {
                            // Resolve the streamID of the location stream
                            return new Promise.resolve(result[0].location);
                        } else {
                            return new Promise.reject(new errors.NoSuchIDError("No such platformID " + platformID));
                        }
                    })
            })
    };


    /**
     * Insert a new location packet for an existing platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform in which to insert the locrec
     * @param {object} locrec - The locrec
     */
    var insertOneLocation = function (platformID, locrec) {

        return dbPromise
            .then(function (db) {
                // Return the promise to return the ID of the location stream
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                // Return the promise to insert the location packet
                return streamManager
                    .insertOnePacket(location_streamID, locrec)
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
        return dbPromise
            .then(function (db) {
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                return streamManager
                    .findPackets(location_streamID, dbQuery);
            });
    };

    var findOneLocation = function (platformID, dbQuery) {
        return dbPromise
            .then(function (db) {
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                return streamManager
                    .findOnePacket(location_streamID, dbQuery);
            });
    };

    var deleteOneLocation = function (platformID, dbQuery) {
        return dbPromise
            .then(function (db) {
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                return streamManager
                    .deleteOnePacket(location_streamID, dbQuery);
            });
    };

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
}
    ;

module.exports = PlatformManagerFactory;