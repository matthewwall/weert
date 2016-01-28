/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Various MongoDB utility functions.
 */

"use strict";

var Promise = require('bluebird');

// Returns a promise to open a collection. For some reason, this is missing in the MongoDB API (only callbacks
// are supported when opening a collection).
var collection = function (db, coln_name, coln_options) {
    return new Promise(function (resolve, reject) {
        db.collection(coln_name, coln_options, function (err, coln) {
            if (err) return reject(err);
            resolve(coln);
        });
    });
};


var calcAggregate = function (collection, obs_type, dbQuery) {

    if (dbQuery.aggregate_type === undefined)
        throw new Error("Attribute aggregate_type required for aggregation");

    var start = dbQuery.start;
    var stop  = dbQuery.stop;
    if (start === undefined) start = 0;
    if (stop === undefined) stop = new Date();

    var agg_operator       = "$" + dbQuery.aggregate_type;
    var agg_expr           = {};
    agg_expr[agg_operator] = "$" + obs_type;
    var match_expr         = {
        $match: {
            _id: {
                $gt : new Date(start),
                $lte: new Date(stop)
            }
        }
    };

    match_expr["$match"][obs_type] = {$ne: null};

    return collection
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
        .then(function (result) {
            var val = result[0] === undefined ? null : result[0].agg_value;
            return new Promise.resolve(val);
        })
};

module.exports = {
    collection   : collection,
    calcAggregate: calcAggregate
};