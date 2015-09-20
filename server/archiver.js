/**
 * @fileOverview The <b>archiver</b> file manages the WeeRT Archiver class
 *
 * @example
 *
 * var MongoClient = require('mongodb').MongoClient;
 * var archiver = require('archiver');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *     var archive;
 *     archiver.createArchive(db, 'archive' , {}, function (err, arc){ if(err)throw err; archive = arc});
 *     archive.insert({'foo' : 'bar'});
 *     db.close();
 * });
 */

/**
 * Create an archive collection if it doesn't already exist.
 * @function createArchive
 *
 * @param {object} db - An instance of the MongoDB Database object.
 * @param {string} archiveName - The name of the archive to be returned. It will be created
 * if it does not exist.
 * @param {object} options - This will be passed on to the createCollection call. Typically used to
 * create a capped collection or the like.
 * @param {archiver-createCallback} callback - This function is called when done. It passes either
 * either an error, or the returned Archiver object.
 *
 */
var createArchive = function (db, archiveName, options, callback) {
    var collection = undefined;
    // See if the archive exists already
    db.listCollections({name: archiveName}).toArray(function (err, names) {
        if (err) return callback(err);
        // Search for the archive name
        for (var i = 0; i < names.length; i++) {
            if (names[i].name === archiveName) {
                // The archive already exists. Retrieve it.
                console.log("Archive", archiveName, "already exists");
                db.collection(archiveName, function (err, coll) {
                    if (err) return callback(err);
                    collection = coll;
                });
            }
        }
        if (!collection) {
            // The archive doesn't exist. Create it.
            db.createArchive(archiveName, options, function (err, coll) {
                if (err) return callback(err);
                collection = coll;
                console.log("Created archive", archiveName);
            });
        }
        return callback(null, new Archiver(collection));
    });
};

/**
 * A class for managing a WeeRT archive collection in a MongoDB database
 * @class Archiver
 * @param {object} collection - An instance of a {@link http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html MongoDB Collection}.
 */
var Archiver = function (collection) {
    var self = this;
    self.archiver = collection;
};

Archiver.prototype.insertRecord = function (record) {
    self.archiver.insert(record);
};

module.exports = {
    createArchive: createArchive,
    Archiver     : Archiver
};

/**
 * This callback is used after creating or retrieving an archive collection
 * @callback archiver-createCallback
 * @param {object} err - Nil unless there is an error.
 * @param {object} archive - An instance of class {@link Archiver}
 */


