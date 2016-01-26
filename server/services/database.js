/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var mongodb     = require('mongodb');
var MongoClient = mongodb.MongoClient;

module.exports = function (dbConfig) {
    console.log("creating connection to", dbConfig.url)
    return MongoClient.connect(dbConfig.url);
};