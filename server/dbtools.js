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

// Returns a promise to create a collection. It will resolve to a MongoClient Promise,
// which can be used by the other methods.
var createCollection = function (connectPromise, coln_name, coln_options) {
    return new Promise(function (resolve, reject) {
        connectPromise
            .then(function (db) {
                db
                    .createCollection(coln_name, coln_options)
                    .then(function () {
                        resolve(connectPromise)
                    })
                    .catch(function (err) {
                        if (err.message.includes("Currently in strict mode"))
                            return resolve(connectPromise);
                        else
                            return reject(err);
                    })
            })
    });
};

// Returns a promise to open a collection.
var collection = function (db, coln_name, coln_options) {
    return new Promise(function (resolve, reject) {
        db.collection(coln_name, coln_options, function (err, coln) {
            if (err) return reject(err);
            resolve(coln);
        });
    });
};


var calcAggregate = function (collection, obs_type, dbQuery) {
    var start = dbQuery.start;
    var stop  = dbQuery.stop;
    if (start === undefined) start = 0;
    if (stop === undefined) stop = new Date();

    if (dbQuery.aggregate_type === undefined)
        dbQuery.aggregate_type = 'avg';
    var agg_operator       = "$" + aggregate_type;
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
            new Promise.resolve(val);
        })
};

module.exports = {
    createCollection  : createCollection,
    collection        : collection,
    calcAggregate     : calcAggregate
};