"use strict";

var platforms_metadata_name    = 'platforms_metadata';

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
    if (platform_metadata.streams === undefined){
        platform_metadata.streams = [];
    }
    // TODO: Check to see if the metadata has an _id field
    self.db.collection(platforms_metadata_name, {strict: false}, function (err, collection) {
        if (err) return callback(err);
        collection.insertOne(platform_metadata, {}, function (err, result) {
            // TODO: Check to see if ops is defined
            var platform_final_metadata = result.ops[0];
            return callback(err, platform_final_metadata);
        });
    });
};

PlatformsManager.prototype.findPlatforms = function (options, callback) {
    "use strict";
    var self         = this;
    var options_copy = dbtools.getOptions(options);
    var limit        = options_copy.limit === undefined ? 0 : +options_copy.limit;
    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0) {
        return callback({message: "Invalid value for 'limit': " + limit})
    }

    self.db.collection(platforms_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.find()
            .limit(limit)
            .sort(options_copy.sort)
            .toArray(callback);
    });
};

PlatformsManager.prototype.findPlatform = function (platformID, callback) {
    "use strict";
    var self = this;

    self.db.collection(platforms_metadata_name, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        try {
            collection.find(
                {
                    _id: {$eq: new mongodb.ObjectID(platformID)}
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
