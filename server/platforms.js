/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var platforms_metadata_name = 'platforms_metadata';

var mongodb = require('mongodb');
var debug   = require('debug')('weert:server');

var dbtools = require('./dbtools');

var _getLocationsCollectionName = function (platformID) {
    return "platforms_" + platformID + "_locations"
};

var PlatformsManager = function (db, options) {
    this.db      = db;
    this.options = options;
};

PlatformsManager.prototype.createPlatform = function (platform_metadata, callback) {
    "use strict";
    var self = this;
    // Make sure the _id field has not been already defined. This is MongoDB's job
    if (platform_metadata._id !== undefined) {
        return callback(new Error("Field _id is already defined"));
    }
    // If the metadata doesn't already have one, include an array to hold the streams associated
    // with this platform.
    if (platform_metadata.streams === undefined) {
        platform_metadata.streams = [];
    }

    self.db.collection(platforms_metadata_name, {strict: false}, function (err, collection) {
        if (err) return callback(err);
        collection.insertOne(platform_metadata, {}, function (err, result) {
            if (err) return callback(err);
            if (result.ops === undefined)
                return callback({message: "internal error. ops undefined"});
            var platform_final_metadata = result.ops[0];

            // Now create the "locations" collection for this platform
            var locations_name = _getLocationsCollectionName(platform_final_metadata._id);
            self.db.createCollection(locations_name, {strict: true}, function (err, location_collection) {
                return callback(err, platform_final_metadata);
            })
        });
    });
};

PlatformsManager.prototype.findPlatforms = function (options, callback) {
    "use strict";
    var self = this;
    // A bad sort direction can cause an exception to be raised:
    try {
        options = dbtools.getOptions(options);
    }
    catch (err) {
        return callback(err)
    }
    var limit = options.limit === undefined ? 0 : +options.limit;
    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0) {
        return callback({message: "Invalid value for 'limit': " + limit})
    }

    self.db.collection(platforms_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.find()
            .limit(limit)
            .sort(options.sort)
            .toArray(callback);
    });
};

PlatformsManager.prototype.findPlatform = function (platformID, callback) {
    "use strict";
    var self = this;

    self.db.collection(platforms_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        try {
            var id_obj = new mongodb.ObjectID(platformID);
        } catch (err) {
            err.description = "Unable to form ObjectID for streamID of " + platformID;
            return callback(err)
        }
        try {
            collection.find(
                {
                    _id: {$eq: id_obj}
                }
                )
                .toArray(callback);
        } catch (err) {
            // Error, perhaps because of an invalid platformID
            return callback(err);
        }
    });
};

PlatformsManager.prototype.createLocationRecord = function (platformID, locrec, callback) {
    var self = this;
    // Make sure the incoming locrec contains a timestamp
    if (locrec.timestamp === undefined) {
        return callback(new Error("No timestamp in location record"));
    }
    // Make sure it does not include an _id field:
    if (locrec._id !== undefined) {
        return callback(new Error("Field _id is already defined"));
        return callback(err);
    }
    // Clone the record, changing timestamp to _id
    var record = {};
    for (var k in locrec) {
        if (locrec.hasOwnProperty(k)) {
            if (k === 'timestamp') {
                record["_id"] = new Date(locrec[k]);
            } else {
                record[k] = locrec[k];
            }
        }
    }
    var collection_name = _getLocationsCollectionName(platformID);
    // Open up the collection. It will be created if it doesn't exist already
    // TODO: Optionally require that the collection exist before allowing insertions
    self.db.collection(collection_name, self.options.locations_collection, function (err, coln) {
        if (err) return callback(err);
        coln.insertOne(record, null, function (err, result) {
            if (err) return callback(err);
            debug("inserted location record with timestamp", record._id);
            return callback(null, result);
        })
    });
};


PlatformsManager.prototype.findLocationRecords = function (platformID, options, callback) {
    var self = this;
    // A bad sort direction can cause an exception to be raised:
    try {
        options = dbtools.getOptions(options);
    }
    catch (err) {
        return callback(err)
    }
    var collection_name = _getLocationsCollectionName(platformID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        dbtools.findByTimestamp(collection, options, function (err, result) {
            if (err) return callback(err);
            return callback(null, result);
        });
    });
};


PlatformsManager.prototype.location = function (platformID, timestamp, options, callback) {

    var self = this;
    // Make sure timestamp is a number
    var timestamp = timestamp === undefined ? Date.now() : +timestamp;
    var match     = options.match === undefined ? "lastbefore" : options.match;
    var query, sort;

    switch (match.toLowerCase()) {
        case 'exact':
            query = {_id: {$eq: new Date(timestamp)}};
            sort  = {};
            break;
        case 'firstafter':
            query = {_id: {$gte: new Date(timestamp)}};
            sort  = {_id: 1};
            break;
        case 'lastbefore':
            query = {_id: {$lte: new Date(timestamp)}};
            sort  = {_id: -1};
            break;
        case 'latest':
            query = { };
            sort  = {_id: -1};
            break;
        default:
            return callback(new Error("Unknown match value: " + match));
    }

    console.log("Search for the location at a given time", timestamp);
    var collection_name = _getLocationsCollectionName(platformID);
    // Open up the collection
    self.db.collection(collection_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.find(query)
            .limit(1)
            .sort(sort)
            .toArray(function (err, results) {
                if (err) return callback(err);

                // We are only interested in the single returned record
                if (results.length < 1) {
                    // No matching timestamp. Return null.
                    return callback(null, null);
                } else {
                    var record = results[0];
                    // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                    // instead of a Date() object:
                    record.timestamp = record._id.getTime();
                    delete record._id;
                    return callback(null, record);
                }
            })
    });
};


module.exports = {
    PlatformsManager: PlatformsManager
};
