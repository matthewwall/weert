"use strict";

var find = function (collection, find_criteria, options, callback) {
    var limit = options.limit === undefined ? 0 : +options.limit;
    var sort  = options.sort === undefined ? {_id: 1} : options.sort;

    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0) {
        return callback({message: "Invalid value for 'limit': " + limit})
    }

    self.db.collection(collection, {strict: true}, function (err, collection) {
        if (err) return callback(err);
        collection.find(find_criteria)
            .limit(limit)
            .sort(sort)
            .toArray(function (err, results) {
                if (err) return callback(err);
                return callback(null, results);
            })
    });

};

var findByTimestamp = function (collection, options, callback) {
    var self = this;
    // Dig any parameters out of the options hash. Make sure to convert any
    // strings to numbers.
    var start = options.start === undefined ? 0 : +options.start;
    var stop  = options.stop === undefined ? Date.now() : +options.stop;
    var limit = options.limit === undefined ? 0 : +options.limit;
    var sort  = options.sort === undefined ? {_id: 1} : options.sort;

    // Test to make sure 'start' is a number
    if (typeof start !== 'number' || (start % 1) !== 0) {
        return callback({message: "Invalid value for 'start': " + start})
    }
    // Test to make sure 'stop' is a number
    if (typeof stop !== 'number' || (stop % 1) !== 0) {
        return callback({message: "Invalid value for 'stop': " + stop})
    }
    // Test to make sure 'limit' is a number
    if (typeof limit !== 'number' || (limit % 1) !== 0) {
        return callback({message: "Invalid value for 'limit': " + limit})
    }
    collection.find(
        {
            _id: {
                $gt: new Date(start),
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


var findOneByTimestamp = function (collection, options, callback) {
    var self      = this;
    var timestamp = +options.timestamp;
    // Test to make sure 'timestamp' is a number
    if (typeof timestamp !== 'number' || (timestamp % 1) !== 0) {
        return callback({message: "Invalid value for 'timestamp': " + timestamp})
    }
    collection.find(
        {
            _id: {
                $eq: new Date(timestamp)
            }
        }
        )
        .limit(1)
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
            }
        )
};

var calcAggregate = function (collection, obs_type, options, callback) {
    var self           = this;
    var start          = options.start === undefined ? 0 : +options.start;
    var stop           = options.stop === undefined ? Date.now() : +options.stop;
    var aggregate_type = options.aggregate_type === undefined ? 'avg' : options.aggregate_type;

    // Test to make sure 'start' is a number
    if (typeof start !== 'number' || (start % 1) !== 0) {
        return callback({message: "Invalid value for 'start': " + start})
    }
    // Test to make sure 'stop' is a number
    if (typeof stop !== 'number' || (stop % 1) !== 0) {
        return callback({message: "Invalid value for 'stop': " + stop})
    }

    var agg_operator               = "$" + aggregate_type;
    var agg_expr                   = {};
    agg_expr[agg_operator]         = "$" + obs_type;
    var match_expr                 = {
        $match: {
            _id: {
                $gt : new Date(start),
                $lte: new Date(stop)
            }
        }
    };
    match_expr["$match"][obs_type] = {$ne: null};

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

var getSortSpec = function (sort_option, direction_option) {
    // The default sort spec:
    var sort_spec = {_id: 1};
    // Has the user explicitly specified a sort?
    if (sort_option !== undefined) {
        // Yes. In what order? Assume ascending order
        var sort_order = 1;
        // Has the user explicitly specified a sort order?
        if (direction_option !== undefined) {
            // Yes.
            switch (direction_option.toLowerCase()) {
                case 'asc':
                    sort_order = 1;
                    break;
                case 'desc':
                    sort_order = -1;
                    break;
                default:
                    throw "Unknown sort order " + direction_option;
            }
        }
        // If the sort option is 'timestamp', then change it to '_id':
        if (sort_option === 'timestamp')
            sort_option = '_id';
        sort_spec = {};
        sort_spec[sort_option] = sort_order
    }
    return sort_spec;
};

var getOptions = function (options) {
    // Clone the options object because we will be modifying it.
    // Also, leave out 'direction', because it will be included in the
    /// new 'sort' attribute.
    var options_copy = {};
    for (var attr in options) {
        if (options.hasOwnProperty(attr) && attr !== 'direction')
            options_copy[attr] = options[attr];
    }
    options_copy.sort = getSortSpec(options.sort, options.direction);
    return options_copy;
};

module.exports = {
    findByTimestamp   : findByTimestamp,
    findOneByTimestamp: findOneByTimestamp,
    calcAggregate     : calcAggregate,
    getSortSpec       : getSortSpec,
    getOptions        : getOptions
};
