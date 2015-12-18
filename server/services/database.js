"use strict";

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

var MongoFactory = function (dbConfig) {
    return MongoClient.connect(dbConfig.url);
};

module.exports = MongoFactory;
