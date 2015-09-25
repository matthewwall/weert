"use strict";
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

/**
 * Manages packets in and out of a MongoDB database.
 * @param {string} url
 * @param {object} options
 * @constructor
 */
var StatelessCollectionMgr = function (base_url, options) {
    var self = this;
    self.base_url = base_url;
    self.options = options || {collection: {capped: true, size: 1000000, max: 3600}};
};

StatelessCollectionMgr.prototype.insertOne = function (in_packet, callback) {
    var self = this;
    if (in_packet.platform === undefined || in_packet.instrument === undefined)
        return callback("Missing platform or instrument ID");
    var db_name = in_packet.platform;
    var collection_name = in_packet.instrument + ".loop_data";
    var full_url = self.base_url + (self.base_url.slice(-1) === '/' ? db_name : ('/' + db_name));
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
    MongoClient.connect(full_url, function (err, db) {
        if (err) return callback(err);
        // Create the collection if it doesn't exist already
        _createCollection(db, collection_name, self.options.collection, function (err, coln) {
            if (err) return callback(err);
            coln.insertOne(packet, null, function (err, result) {
                if (err) return callback(err);
                console.log("inserted packet with timestamp", packet._id);
                db.close();
                return callback(null, result);
            })
        });
    });
};

StatelessCollectionMgr.prototype.find = function (start, stop, platform, instrument, callback) {
    var self = this;
    if (platform === undefined || instrument === undefined)
        return callback("Missing platform or instrument ID");
    var db_name = platform;
    var collection_name = instrument + ".loop_data";
    // Check to see if the URL ends with a slash before tacking on the database name:
    var full_url = self.base_url + (self.base_url.slice(-1) === '/' ? db_name : ('/' + db_name));
    MongoClient.connect(full_url, function (err, db) {
        if (err) return callback(err);
        db.collection(collection_name, function (err, coln) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                coln.find({"_id": {"$gt": new Date(start), "$lte": new Date(stop)}}).toArray(function (err, results) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }
                        db.close();
                        // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                        // instead of a Date() object:
                        for (var i = 0; i < results.length; i++) {
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

var _createCollection = function (db, collectionName, options, callback) {
    console.log("in _createCollection with db", db.s.databaseName);
    // See if the collection exists already
    db.listCollections({name: collectionName}).toArray(function (err, names) {
        if (err) return callback(err);
        if (names.length) {
            // The collection already exists. Just retrieve it.
            db.collection(collectionName, function (err, coln) {
                return callback(null, coln);
            })
        } else {
            // The collection does not exist yet. Create it, then return it.
            db.createCollection(collectionName, options, function (err, coln) {
                console.log("Created collection", collectionName);
                return callback(null, coln);
            });
        }
    });
};

var calcAggregate = function (collection, start, stop, obs_type, aggregate_type, callback) {
    var agg_operator = "$" + aggregate_type;
    var agg_expr={};
    agg_expr[agg_operator] = "$" + obs_type;
    collection.aggregate(
        [
            {
                $match: {
                    _id     : {
                        $gt : new Date(start),
                        $lte: new Date(stop)
                    },
                    outside_temperature: {$ne: null}
                }
            },
            {
                $group: {
                    _id: null,
                    agg_value: agg_expr
                }
            }
        ],
        {},
        function (err, result) {
            if (err) return callback(err);
            return callback(null, result[0].agg_value)
        })
};

module.exports = {
    StatelessCollectionMgr: StatelessCollectionMgr,
    calcAggregate : calcAggregate
};

/**
 * This callback is used after creating or retrieving a collection
 * @callback dbhelper-createCallback
 * @param {object} err - Nil unless there is an error.
 * @param {object} collection - An instance of a {@link http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html MongoDB Collection}..
 */


