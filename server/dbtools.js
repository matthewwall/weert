"use strict";

var find = function (collection, options, callback) {
    var self  = this;
    // Dig any parameters out of the options hash. Make sure to convert any
    // strings to numbers.
    var start = options.start === undefined ? 0          : +options.start;
    var stop  = options.stop  === undefined ? Date.now() : +options.stop;
    var limit = options.limit === undefined ? 0          : +options.limit;
    var sort  = options.sort  === undefined ? {_id: 1}   :  options.sort;

    collection.find(
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
};


var findOne = function(collection, options, callback){
    var self = this;
    var timestamp = +options.timestamp;
    collection.find(
        {
            _id: {
                $eq : new Date(timestamp)
            }
        }
    )
        .limit(1)
        .toArray(function (err, results) {
            if (err) return callback(err);
            // We are only interested in the single returned record
            if (results.length < 1){
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
        }
    )
};

var calcAggregate = function (collection, obs_type, options, callback) {
    var self = this;
    var start = options.start === undefined ? 0          : +options.start;
    var stop  = options.stop  === undefined ? Date.now() : +options.stop;
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
    find            : find,
    findOne         : findOne,
    calcAggregate   : calcAggregate
};
