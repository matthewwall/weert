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

/**
 * Factory that produces an interface to manage platforms. The interface is dependent
 * on a database Promise, and some options.
 * @param dbPromise - A Promise to a database connection
 * @param options - A set of options for the database collections
 * @alias module:services/platform.PlatformManagerFactory
 * @return {PlatformManager}
 */
var PlatformManagerFactory = function (dbPromise, options) {

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
            if (!platform_metadata.name)
                return reject(new Error("Field 'name' is required"));
            // If the metadata doesn't already have one, include an array to hold the streams associated
            // with this platform.
            if (platform_metadata.streams === undefined) {
                platform_metadata.streams = [];
            }
            var platform_final_metadata = undefined;
            dbPromise
                .then(function (db) {

                    return db
                        .collection(options.platforms.metadata_name, options.platforms.options)
                        .insertOne(platform_metadata, {})
                        .then(function (result) {
                            // This will hold the final metadata, including the _id assigned by MongoDB:
                            platform_final_metadata = result.ops[0];
                            // The name for the collection holding locations for this platform:
                            var collection_name = options.locrecs.name(platform_final_metadata._id);
                            // Now create the locations collection. It will return a Promise
                            return db
                                .createCollection(collection_name);
                        })
                })
                .then(function (dummy) {
                    return resolve(platform_final_metadata);
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
                    db.collection(platform_collection_name, {strict: true}, function (err, collection) {
                        if (err)
                            return reject(err);
                        // Make a copy of the metadata. We're going to modify it
                        var md = util._extend({}, platform_metadata);
                        // The save method does not overwrite the streams data, so delete it.
                        delete md.streams;
                        delete md._id;

                        collection
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

            var platform_collection_name = options.platforms.metadata_name;
            var locrecs_collection_name  = options.locrecs.name(platformID);

            dbPromise
                .then(function (db) {

                    // First, a promise to delete the platform from the collection of platforms
                    var p1 = new Promise(function (resolve1, reject1) {
                        db.collection(platform_collection_name, {strict: true}, function (err, collection) {
                            if (err) {
                                // The metadata collection doesn't exist. That's OK, because our goal is to
                                // delete the platform, so our mission is accomplished.
                                return resolve1({result: {ok: 1, n: 0}});
                            }
                            // Delete the platform metadata from the collection of platform metadata
                            collection
                                .deleteOne({_id: {$eq: id_obj}}, {})
                                .then(resolve1)
                                .catch(reject1);
                        });
                    });

                    // Then a promise to delete the location records collection
                    var p2 = new Promise(function (resolve2, reject2) {
                        db
                            .dropCollection(locrecs_collection_name)
                            .then(resolve2)
                            .catch(resolve2);   // Even if the collection is not there, we have been successful.
                    });

                    // Resolve both the promises, using Promise.all.
                    Promise
                        .all([p1, p2])
                        .then(function (result) {
                            return resolve(result[0].result);
                        })
                        .catch(function (err) {
                            // Only the first promise can generate an error.
                            return resolve({ok: 1, n: 0});
                        });

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
        return new Promise(function (resolve, reject) {
            dbPromise
                .then(function (db) {
                    db.collection(options.platforms.metadata_name, {strict: true}, function (err, collection) {
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
        })
    };

    var findPlatform = function (platformID) {
        return new Promise(function (resolve, reject) {
            dbPromise
                .then(function (db) {
                    db.collection(options.platforms.metadata_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        // A bad _id will cause an exception. Be prepared to catch it
                        try {
                            var id_obj = new mongodb.ObjectID(platformID);
                        } catch (err) {
                            err.description = "Unable to form ObjectID for platformID of " + platformID;
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
     * Insert a new location record (locrec) for an existing platform
     * @method insertOneLocation
     * @param {number} platformID - The ID of the platform in which to insert the locrec
     * @param {object} locrec - The locrec
     */
    var insertOneLocation = function (platformID, locrec) {
        return new Promise(function (resolve, reject) {
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

    var findOneLocation = function (platformID, dbQuery) {
        return new Promise(function (resolve, reject) {
            var collection_name = options.locrecs.name(platformID);
            dbPromise
                .then(function (db) {
                    db.collection(collection_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        dbtools
                            .findOneByTimestamp(collection, dbQuery)
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