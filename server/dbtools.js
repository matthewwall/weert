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


var find = function (db, collection_name, options, callback) {
    var self = this;
    var start = options.start === undefined ? 0 : options.start;
    var stop = options.stop === undefined ? Date.now() : options.stop;
    var limit = options.limit === undefined ? 0 : options.limit;
    var sort = options.sort === undefined ? {_id: 1} : options.sort;

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
                .sort(sort)
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


var calcAggregate = function (collection, obs_type, options, callback) {
    var self = this;
    var start = options.start === undefined ? 0 : options.start;
    var stop = options.stop === undefined ? Date.now() : options.stop;
    var aggregate_type = options.aggregate_type === undefined ? 'avg' : options.aggregate_type;

    var agg_operator = "$" + aggregate_type;
    var agg_expr = {};
    agg_expr[agg_operator] = "$" + obs_type;
    var match_expr = {
        $match: {
            _id : {
                $gt : new Date(start),
                $lte: new Date(stop)
            }
        }
    };
    match_expr["$match"][obs_type] = {$ne : null};

    collection.aggregate(
        [
            match_expr,
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
            var val = result[0] === undefined ? null : result[0].agg_value;
            return callback(null, val)
        })
};

module.exports = {
    createCollection: createCollection,
    find            : find,
    calcAggregate   : calcAggregate
};
