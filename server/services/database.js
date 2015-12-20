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

