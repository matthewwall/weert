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

var dbtools = require('../dbtools');
var stream  = require('./stream');
var errors  = require('../errors');

/**
 * Factory that produces an interface to manage platforms. The interface is dependent
 * on a database Promise, and some options.
 */
var PlatformManagerFactory = function (dbPromise, options, streamManager) {

    /**
     * Create a new platform
     * @method createPlatform
     * @param {object} platform_metadata - The platform's metadata
     * @returns {Promise.resolved|Promise.rejected}
     */
    var createPlatform = function (platform_metadata) {

        // Make sure the _id field has not been already defined. This is MongoDB's job
        if (platform_metadata._id !== undefined) {
            return new Promise.reject(new Error("Field _id is already defined"));
        }

        return dbPromise
            .then(function (db) {
                return dbtools
                    .cropen_collection(db, options.platforms.metadata_name, options.platforms)
            })
            .then(function (coln) {
                var namePromise;
                // Platform names must be unique. If a name was given, check the database to see if already exists.
                if (platform_metadata.name) {
                    // A name was given. Return a promise for an array of platforms with the same name
                    namePromise = coln
                        .find({name: {$eq: platform_metadata.name}})
                        .toArray();

                } else {
                    // No name was given, so no need to test for uniqueness.
                    // Create an already fulfilled promise, holding an empty array.
                    namePromise = new Promise.resolve([]);
                }
                return namePromise
                    .then(function (platforms) {
                        if (platforms.length) {
                            // Name already exists. Error.
                            return new Promise.reject(new errors.DuplicateNameError("Platform name " +
                                platform_metadata.name + " already exists"));
                        } else {
                            // Name does not exist. Proceed.
                            // Return a promise to insert the platform metadata
                            return coln
                                .insertOne(platform_metadata)
                                .then(function (results) {
                                    // We need to massage the promise a bit before returning it
                                    return new Promise.resolve(results.ops[0])
                                })
                                .then(function (alloc_metadata) {
                                    // We have the metadata for the freshly created platform, which holds the allocated _id.
                                    // If the initial platform metadata did not include a stream to hold the platform
                                    // location, we will have to allocate one, and use the _id to give it a unique
                                    // name
                                    if (platform_metadata.location) {
                                        // The location stream already exists. We're done.
                                        return Promise.resolve(alloc_metadata);
                                    } else {
                                        // There is no platform location stream. Return a Promise to create one.
                                        // We'll then have to patch the platform metadata with the _id of
                                        // the allocated stream.
                                        return streamManager.createStream({
                                                name       : "locations/" + alloc_metadata._id,
                                                description: "Location data for platform " + alloc_metadata._id,
                                                unit_group : "METRIC"
                                            })
                                            .then(function (locstream_metadata) {
                                                alloc_metadata.location = locstream_metadata._id;
                                                // Patch the platform metadata with the _id of the allocated stream
                                                return updatePlatform(alloc_metadata._id,
                                                    {location: locstream_metadata._id}, true)
                                            })
                                            .then(function () {
                                                return Promise.resolve(alloc_metadata);
                                            });
                                    }
                                });
                        }
                    });
            });
    };


    var updatePlatform = function (platformID, platform_metadata, allow_location) {

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

        return dbPromise
            .then(function (db) {
                return dbtools
                    .collection(db, options.platforms.metadata_name, options.platforms.options)
            })
            .then(function (coln) {
                var namePromise;
                // You can change the name, but only to another unique name. So, if a name was specified,
                // we need to make sure it is not already in the database
                if (platform_metadata.name) {
                    // A name was given. Return a promise for all the platforms potentially matching the name
                    namePromise = coln
                        .find({name: {$eq: platform_metadata.name}})
                        .toArray();

                } else {
                    // No name was given, so no need to test for uniqueness.
                    // Create an already fulfilled promise, holding an empty array.
                    namePromise = new Promise.resolve([]);
                }
                return namePromise
                    .then(function (platforms) {

                        if (platforms.length) {
                            // We found a match for the name. But, perhaps it is the same platform?
                            if (String(platforms[0]._id) !== platformID) {
                                // Unfortunately, it's a different platform, so the name is already taken.
                                // Signal the error
                                return new Promise.reject(new errors.DuplicateNameError("Name " + platform_metadata.name + " already in use"))
                            }
                        }

                        // Make a copy of the metadata. We're going to modify it
                        var md = Object.assign({}, platform_metadata);
                        // In general, we do not allow the platform location stream to be changed.
                        if (!allow_location) delete md.location;
                        // You can't change the platform's ID.
                        delete md._id;

                        // Returns a promise to update the platform metadata
                        return coln
                            .updateOne({_id: {$eq: id_obj}}, {$set: md});
                    })
            })
    };


    /**
     * Delete a specific platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform to delete
     * @returns {bluebird|exports|module.exports}
     */
    var deletePlatform = function (platformID) {
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
                            .find({_id: {$eq: id_obj}})
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
                                var p2 = streamManager.deleteStream(location_streamID);

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
        var findQuery = Object.assign({}, dbQuery);
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
                            .sort(dbQuery.sort)
                            .limit(dbQuery.limit)
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

        // A bad _id will cause an exception. Be prepared to catch it
        try {
            var id_obj = new mongodb.ObjectID(platformID);
        } catch (err) {
            err.description = "Unable to form ObjectID for platformID of " + platformID;
            return new Promise.reject(err)
        }
        // Open up the metadata collection to get the streamID of the location stream
        return dbtools
            .collection(db, options.platforms.metadata_name, options.platforms.options)
            .then(function (coln) {
                // Hit the database to get the ID of the location stream
                return coln
                    .find({_id: {$eq: id_obj}})
                    .limit(1)
                    .toArray()
                    .then(function (result) {
                        if (result.length) {
                            // Resolve the streamID of the location stream
                            return Promise.resolve(result[0].location);
                        } else {
                            return Promise.reject(new errors.NoSuchIDError("No such platformID " + platformID));
                        }
                    });
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
                    .insertPacket(location_streamID, locrec)
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

    var findLocation = function (platformID, dbQuery) {
        return dbPromise
            .then(function (db) {
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                return streamManager
                    .findPacket(location_streamID, dbQuery);
            });
    };

    var deleteLocation = function (platformID, dbQuery) {
        return dbPromise
            .then(function (db) {
                return _getLocationStreamID(db, platformID);
            })
            .then(function (location_streamID) {
                return streamManager
                    .deletePacket(location_streamID, dbQuery);
            });
    };

    return {
        createPlatform   : createPlatform,
        updatePlatform   : updatePlatform,
        deletePlatform   : deletePlatform,
        findPlatforms    : findPlatforms,
        findPlatform     : findPlatform,
        insertOneLocation: insertOneLocation,
        findLocations    : findLocations,
        findLocation     : findLocation,
        deleteLocation   : deleteLocation
    }
}
    ;

module.exports = PlatformManagerFactory;