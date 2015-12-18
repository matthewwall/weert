/**
 * StreamFactory module
 * @module services/stream
 * @type {bluebird|exports|module.exports}
 */

Promise = require('bluebird');

var StreamFactory = function (dbConnect, options) {

    /**
     * Create a new stream
     * @param {object} stream_metadata - The stream's metadata
     * @returns {Promise}
     */
    var createStream = function (stream_metadata) {
        return new Promise(function (resolve, reject) {
            // Make sure the _id field has not been already defined. MongoDB will do this.
            if (stream_metadata._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }
            dbConnect
                .then(function (db) {
                    // This returns a promise
                    return db
                        .collection(options.streams.metadata_name, options.streams.options)
                        .insertOne(stream_metadata, {});
                })
                .then(function (result) {
                    var stream_final_metadata = result.ops[0];
                    return resolve(stream_final_metadata);
                })
                .catch(function (err) {
                    return reject(err);
                });
        });
    };


    /**
     * Find all streams
     * @param {object} query - Hash of query options
     * @param {object} [query.sort={_id:1} - Mongo sort option.
     * @param {number} [query.limit] - The number of packets to return. If missing, return them all.
     * @returns {Promise}
     */
    var findStreams = function (query) {
        return new Promise(function (resolve, reject) {
            // Supply a default query if necessary:
            if (query === undefined) {
                query = {
                    sort : {_id: 1},
                    limit: 0
                }
            }
            var limit = query.limit === undefined ? 0 : +query.limit;
            // Test to make sure 'limit' is a number
            if (typeof limit !== 'number' || (limit % 1) !== 0) {
                return reject(new Error("Invalid value for limit: " + limit))
            }
            dbConnect
                .then(function (db) {
                    db.collection(options.streams.metadata_name, {strict: true}, function (err, collection) {
                        if (err) return reject(err);
                        collection
                            .find()
                            .limit(limit)
                            .sort(query.sort)
                            .toArray()
                            .then(resolve)
                            .catch(reject);
                    });
                })
                .catch(reject);
        })
    };

    /**
     * Insert a new packet into an existing stream
     * @param {number} streamID - The ID of the stream in which to insert the packet
     * @param {object} packet - The packet
     */
    var insertOne = function (streamID, packet) {
        return new Promise(function (resolve, reject) {
            // Make sure the incoming packet contains a timestamp
            if (packet.timestamp === undefined) {
                return reject(new Error("No timestamp in packet"));
            }
            // Make sure it does not include an _id field:
            if (packet._id !== undefined) {
                return reject(new Error("Field _id is already defined"));
            }
            // Change key timestamp to _id
            packet._id = new Date(packet.timestamp);
            delete packet.timestamp;
            // Get the name of the Mongo collection the packet should go in
            var collection_name = options.packets.name(streamID);
            dbConnect
                .then(function (db) {
                    return db
                        .collection(collection_name, options.packets.options)
                        .insertOne(packet);
                })
                .then(function (result) {
                    return resolve(result.ops[0]);
                })
                .catch(function (err) {
                    return reject(err);
                })
        });
    };


    return {
        createStream: createStream,
        findStreams : findStreams,
        insertOne   : insertOne
    }
};


module.exports = StreamFactory;