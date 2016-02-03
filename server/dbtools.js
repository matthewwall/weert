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

// Returns a promise to open a collection. For some reason, this is missing in the MongoDB Node API (only callbacks are
// supported when opening a collection).
// An error will be raised if the collection does not exist.
var collection = function (db, coln_name, coln_options) {
    return new Promise(function (resolve, reject) {
        // Always open in "strict" mode. This will cause an error if the collection does not exist.
        db.collection(coln_name, Object.assign(coln_options, {strict: true}), function (err, coln) {
            if (err) return reject(err);
            resolve(coln);
        });
    });
};

// Returns a promise to either open a collection, or if it does not exist, create it.
var cropen_collection = function (db, coln_name, cropen_options) {
    // First try to open the collection
    return collection(db, coln_name, cropen_options.options)
        .catch(function (err) {
            // We had an error, probably because it didn't exist. Try creating the collection.
            return db
                .createCollection(coln_name, cropen_options.options)
        })
        .then(function (coln) {
            // We've created the collection. Is an index requested?
            if (cropen_options.index) {
                // Yes. Create the index.
                return coln
                    .createIndex(cropen_options.index.keys, cropen_options.index.options)
                    .then(function () {
                        // We can now resolve the promise with the created & indexed collection.
                        return new Promise.resolve(coln);
                    });
            } else {
                // No index needed. Resolve the promise with the created collection.
                return new Promise.resolve(coln);
            }
        });
};


var calcAggregate = function (coln, obs_type, dbQuery) {

    if (dbQuery.aggregate_type === undefined)
        throw new Error("Attribute aggregate_type required for aggregation");

    var query = dbQuery.query;
    var start = dbQuery.start;
    var stop  = dbQuery.stop;
    if (query === undefined) query = {};
    if (start === undefined) start = 0;
    if (stop === undefined) stop = new Date();

    var agg_operator       = "$" + dbQuery.aggregate_type;
    var agg_expr           = {};
    agg_expr[agg_operator] = "$" + obs_type;    // Something like {$max: $outside_temperature}

    // Build the match expression. We need to merge the restrictions, such as date restrictions,
    // with any queries the user may have supplied.
    // Start with the query. Make a copy of it
    var qmatch = Object.assign({}, query);

    // If no query on the observation type has been assigned, add an empty query
    if (qmatch[obs_type] === undefined) qmatch[obs_type] = {};
    // Now make sure the observation type is non-null
    qmatch[obs_type]["$ne"] = null;
    // If no query on the _id has been assigned, add an empty query
    if (qmatch["_id"] === undefined) qmatch["_id"] = {};
    // Now make sure the _id is between the given dates
    qmatch["_id"] = {$gt: new Date(start), $lte: new Date(stop)};

    return coln
        .aggregate([
            {
                $match: qmatch
            },
            {
                $group: {
                    _id      : null,
                    agg_value: agg_expr
                }
            }
        ])
        .toArray()
        .then(function (result) {
            var val = result[0] === undefined ? null : result[0].agg_value;
            return new Promise.resolve(val);
        })
};

module.exports = {
    collection       : collection,
    cropen_collection: cropen_collection,
    calcAggregate    : calcAggregate
};