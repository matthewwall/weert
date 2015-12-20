/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var url          = require('url');
var normalizeUrl = require('normalize-url');

// Given a request header and a name, form a new endpoint
var resourcePath = function (req, name) {
    var base_pathname = url.parse(req.originalUrl).pathname;
    var fullpath      = url.format({
        protocol: req.protocol,
        host    : req.get('host'),
        pathname: base_pathname + '/' + name
    });
    return normalizeUrl(fullpath);
};

var fromError = function (code, err) {
    var e     = {};
    e.message = err.message;
    e.code    = code;
    if (err.description) {
        e.description = err.description;
    }
    return e;
};

var getSortSpec = function (sort_option, direction_option) {

    var sort_field = sort_option === undefined ? "_id" : sort_option;
    var direction  = direction_option === undefined ? "asc" : direction_option;

    // If the sort option is 'timestamp', then change it to '_id':
    if (sort_field === 'timestamp')
        sort_field = '_id';

    // Convert sort direction to +1 or -1
    switch (direction.toLowerCase()) {
        case 'asc':
            direction = 1;
            break;
        case 'desc':
            direction = -1;
            break;
        default:
            throw new Error("Unknown sort order: " + direction_option);
    }
    var sort_spec         = {};
    sort_spec[sort_field] = direction;
    return sort_spec;
};

var formDbQuery = function (query) {
    if (query === undefined) {
        return {
            sort : {_id: 1},
            limit: 0
        };
    }
    var dbQuery = {};
    // Convert the sort information to a MongoDB style sort hash
    dbQuery.sort  = getSortSpec(query.sort, query.direction);
    dbQuery.limit = query.limit === undefined ? 0 : +query.limit;
    // Test to make sure 'limit' is a number
    if (typeof dbQuery.limit !== 'number' || (dbQuery.limit % 1) !== 0) {
        throw new Error("Invalid value for limit: " + query.limit);
    }
    return dbQuery;
};

module.exports = {
    resourcePath: resourcePath,
    fromError   : fromError,
    getSortSpec : getSortSpec,
    formDbQuery : formDbQuery
};
