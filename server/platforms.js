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


module.exports = {
    PlatformsManager: PlatformsManager
};
