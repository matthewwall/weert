/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

// This is a singleton:
var mongoPromise = undefined;

module.exports = function (dbConfig){
    if (!mongoPromise)
        mongoPromise = MongoClient.connect(dbConfig.url);
    return mongoPromise;
};

