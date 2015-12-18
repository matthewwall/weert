Promise = require('bluebird');

var StreamFactory = function (dbConnect, options) {


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
        insertOne   : insertOne
    }
};


module.exports = StreamFactory;