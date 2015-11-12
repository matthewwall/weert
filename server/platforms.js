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

module.exports = {
    PlatformsManager: PlatformsManager
};
