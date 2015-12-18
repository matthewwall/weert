"use strict";

var Promise = require('bluebird');

var findByTimestamp = function (collection, options) {

    return new Promise(function (resolve, reject) {
        // Dig any parameters out of the options hash. Make sure to convert any
        // strings to numbers.
        var start = options.start === undefined ? 0 : +options.start;
        var stop = options.stop === undefined ? Date.now() : +options.stop;
        var limit = options.limit === undefined ? 0 : +options.limit;
        var sort = options.sort === undefined ? {_id: 1} : options.sort;

        // Test to make sure 'start' is a number
        if (typeof start !== 'number' || (start % 1) !== 0) {
            return reject(new Error("Invalid value for 'start': " + start))
        }
        // Test to make sure 'stop' is a number
        if (typeof stop !== 'number' || (stop % 1) !== 0) {
            return reject(new Error("Invalid value for 'stop': " + stop))
        }
        // Test to make sure 'limit' is a number
        if (typeof limit !== 'number' || (limit % 1) !== 0) {
            return reject(new Error("Invalid value for 'limit': " + limit))
        }
        collection
            .find(
                {
                    _id: {
                        $gt : new Date(start),
                        $lte: new Date(stop)
                    }
                }
            )
            .limit(limit)
            .sort(sort)
            .toArray()
            .then(function (result) {
                // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                // instead of a Date() object:
                for (var i = 0; i < results.length; i++) {
                    results[i].timestamp = results[i]._id.getTime();
                    delete results[i]._id;
                }
                return resolve(results);

            })
            .catch(reject);
    });
};

var findOneByTimestamp = function (collection, options) {
    return new Promise(function (resolve, reject) {
        var timestamp = +options.timestamp;
        // Test to make sure 'timestamp' is a number
        if (typeof timestamp !== 'number' || (timestamp % 1) !== 0) {
            return reject(new Error("Invalid value for 'timestamp': " + timestamp))
        }
        collection
            .find({_id: {$eq: new Date(timestamp)}})
            .limit(1)
            .toArray()
            .then(function (results) {
                // We are only interested in the single returned record
                if (results.length < 1) {
                    // No matching timestamp. Return null.
                    return resolve(null);
                } else {
                    var record = results[0];
                    // Use the key "timestamp" instead of "_id", and send the result back in milliseconds,
                    // instead of a Date() object:
                    record.timestamp = record._id.getTime();
                    delete record._id;
                    return resolve(record);
                }
            })
            .catch(reject);
    })
};

module.exports = {
    findByTimestamp   : findByTimestamp,
    findOneByTimestamp: findOneByTimestamp
};