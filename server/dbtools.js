"use strict";

var createCollection = function (db, collectionName, options, callback) {
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


var find = function (db, collection_name, start, stop, limit, callback) {
    var self = this;
    if (limit === undefined)
        limit = 0;
    db.collection(collection_name, function (err, coln) {
            if (err) return callback(err);
            coln.find(
                {
                    _id: {
                        $gt : new Date(start),
                        $lte: new Date(stop)
                    }
                }
            )
                .limit(limit)
                .toArray(function (err, results) {
                    if (err) return callback(err);
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
};


var calcAggregate = function (collection, start, stop, obs_type, aggregate_type, callback) {
    var agg_operator = "$" + aggregate_type;
    var agg_expr = {};
    agg_expr[agg_operator] = "$" + obs_type;
    collection.aggregate(
        [
            {
                $match: {
                    _id                : {
                        $gt : new Date(start),
                        $lte: new Date(stop)
                    },
                    outside_temperature: {$ne: null}
                }
            },
            {
                $group: {
                    _id      : null,
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
    createCollection: createCollection,
    find            : find,
    calcAggregate   : calcAggregate
};
