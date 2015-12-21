/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var Promise = require('bluebird');

var findByTimestamp = function (collection, dbQuery) {

    return new Promise(function (resolve, reject) {
        collection
            .find({
                _id: {
                    $gt : new Date(dbQuery.start),
                    $lte: new Date(dbQuery.stop)
                }
            })
            .limit(dbQuery.limit)
            .sort(dbQuery.sort)
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

var findOneByTimestamp = function (collection, dbQuery) {
    return new Promise(function (resolve, reject) {
        collection
            .find({
                _id: {
                    $eq: new Date(dbQuery.timestamp)
                }
            })
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

var calcAggregate = function (collection, obs_type, dbQuery) {
    return Promise(function (resolve, reject) {
        if (dbQuery.aggregate_type === undefined)
            dbQuery.aggregate_type = 'avg';
        var agg_operator       = "$" + aggregate_type;
        var agg_expr           = {};
        agg_expr[agg_operator] = "$" + obs_type;
        var match_expr         = {
            $match: {
                _id: {
                    $gt : new Date(dbQuery.start),
                    $lte: new Date(dbQuery.stop)
                }
            }
        };

        match_expr["$match"][obs_type] = {$ne: null};

        collection
            .aggregate(
                [
                    match_expr,
                    {
                        $group: {
                            _id      : null,
                            agg_value: agg_expr
                        }
                    }
                ],
                {})
            .toArray()
            .then(function(result){
                var val = result[0] === undefined ? null : result[0].agg_value;
                resolve(val);
            })
            .catch(reject)
    })
};

module.exports = {
    findByTimestamp   : findByTimestamp,
    findOneByTimestamp: findOneByTimestamp,
    calcAggregate     : calcAggregate
};