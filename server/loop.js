"use strict";
var mongo = require('mongodb');

/**
 * Manages loop packets in and out of the database.
 * @param {string} url
 * @param {object} options
 * @constructor
 */
var LoopManager = function (url, options) {
    var self = this;
    self.url = url;
    self.options = options;
};

LoopManager.prototype.insert = function (in_packet, callback) {
    var self = this;
    if (in_packet.platform === undefined || in_packet.instrument === undefined)
        return callback("Missing platform or instrument ID");
    var db_name = in_packet.platform;
    var collection_name = in_packet.instrument + ".loop_data";
    // Clone the packet, changing timestamp to _id, and not passing on the platform and instrument names
    var packet = {};
    for (var k in in_packet) {
        if (in_packet.hasOwnProperty(k)) {
            if (k === 'timestamp') {
                packet["_id"] = new Date(in_packet[k]);
            } else {
                if (k !== 'platform' && k !== 'instrument') {
                    packet[k] = in_packet[k];
                }
            }
        }
    }
    var MongoClient = mongo.MongoClient;
    // Check to see if the URL ends with a slash before tacking on the database name:
    var full_url = self.url + (self.url.slice(-1) === '/' ? db_name : ('/' + db_name));
    MongoClient.connect(full_url, function (err, db) {
        if (err) return callback(err);
        // Create the collection if it doesn't exist already
        self._createCollection(db, collection_name, self.options, function (err, coln) {
            if (err) return callback(err);
            coln.insert(packet, null, function (err, result) {
                if (err) return callback(err);
                console.log("inserted packet with timestamp", packet._id);
                db.close();
                return callback(null, result);
            })
        });
    });
};

LoopManager.prototype.find = function (start, stop, platform, instrument, callback) {
    var self = this;
    if (platform === undefined || instrument === undefined)
        return callback("Missing platform or instrument ID");
    var db_name = platform;
    var collection_name = instrument + ".loop_data";
    var MongoClient = mongo.MongoClient;
    // Check to see if the URL ends with a slash before tacking on the database name:
    var full_url = self.url + (self.url.slice(-1) === '/' ? db_name : ('/' + db_name));
    MongoClient.connect(full_url, function (err, db) {
        if (err) return callback(err);
        db.collection(collection_name, function (err, coln) {
                if (err) {db.close(); return callback(err);}
                coln.find({"_id": {"$gt": new Date(start), "$lte": new Date(stop)}}).toArray(function (err, results) {
                        if (err) {db.close(); return callback(err);}
                        db.close();
                        // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                        // instead of a Date() object:
                        for (var i=0; i<results.length; i++){
                            results[i].timestamp = results[i]._id.getTime();
                            delete results[i]._id;
                        }
                        return callback(null, results);
                    }
                )
            }
        )
    });
};

LoopManager.prototype._createCollection = function (db, collectionName, options, callback) {
    var collection = undefined;
    // See if the collection exists already
    db.listCollections({name: collectionName}).toArray(function (err, names) {
        if (err) return callback(err);
        if (names.length) {
            db.collection(collectionName, function (err, coln) {
                return callback(null, coln);
            })
        } else {
            db.createCollection(collectionName, options, function (err, coln) {
                console.log("Created collection", collectionName);
                return callback(null, coln);
            });
        }
    });
};

module.exports = {
    LoopManager: LoopManager
};

/**
 * This callback is used after creating or retrieving a collection
 * @callback dbhelper-createCallback
 * @param {object} err - Nil unless there is an error.
 * @param {object} collection - An instance of a {@link http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html MongoDB Collection}..
 */


