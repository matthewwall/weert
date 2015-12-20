/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

// Stream-related routes

"use strict";

var debug   = require('debug')('weert:server');
var express = require('express');

var auxtools = require('../auxtools');

var StreamRoutes = function (stream_manager) {

    var router = express.Router();

    // Create a new stream
    router.post('/streams', function (req, res) {
        if (req.is('json')) {
            // Get the metadata
            var metadata = req.body;
            stream_manager
                .createStream(metadata)
                .then(function (result) {
                    var resource_url = auxtools.resourcePath(req, result._id);
                    res.status(201).location(resource_url).json(result);
                })
                .catch(function (err) {
                    res.status(400).json(auxtools.fromError(400, err));
                })
        } else {
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }

    });

    // Return an array of URIs to streams that satisfy a query.
    router.get('/streams', function (req, res) {
        var dbQuery;
        // A bad sort direction or limit can cause an exception to be raised:
        try {
            dbQuery = auxtools.formDbQuery(req.query);
        }
        catch (err) {
            err.description = req.query;
            throw err;
        }

        stream_manager
            .findStreams(dbQuery)
            .then(function (streams_array) {
                debug("# of streams=", streams_array.length);
                // Form URIs for all the streams that were found which satisfied the query
                var stream_uris = [];
                for (var i = 0; i < streams_array.length; i++) {
                    stream_uris[i] = auxtools.resourcePath(req, streams_array[i]._id);
                }
                // Return the array
                res.json(stream_uris);

            })
            .catch(function (err) {
                debug("Unable to find streams. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            });
    });


    // Return the metadata of a particular stream
    router.get('/streams/:streamID', function (req, res) {
        // Get the streamID out of the route path
        var streamID = req.params.streamID;
        debug("Request for streamID", streamID);

        stream_manager
            .findStream(streamID)
            .then(function (stream_metadata) {
                // If the array of streams is zero lengthed, that mean the stream was not found. Return a 404 error
                if (stream_metadata.length) {
                    res.json(stream_metadata[0]);
                } else {
                    res.sendStatus(404);
                }

            })
            .catch(function (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
                console.log("Bad stream ID", err);
            });
    });

//// RESTful interface for requesting packets or an aggregation from a stream, which
//// satisfies a search query.
//router.get('/streams/:streamID/packets', function (req, res) {
//    // Get the streamID out of the route path
//    var streamID = req.params.streamID;
//    // Is an aggregation being requested?
//    if (req.query.aggregate_type !== undefined) {
//        // Yes, an aggregation is being requested.
//        debug("Request for aggregation", req.query.aggregate_type,
//            "with start, stop times of", req.query.start, req.query.stop);
//        var obs_type = req.query.obs_type;
//        stream_manager.aggregate(streamID, obs_type, req.query, function (err, result) {
//            if (err) {
//                debug("Unable to satisfy aggregation request. Reason", err);
//                res.status(400).json(auxtools.fromError(400, err));
//            } else {
//                res.json(result);
//            }
//        });
//    } else {
//        debug("Request for packets with start, stop times of", req.query.start, req.query.stop);
//        stream_manager.find(streamID, req.query, function (err, packet_array) {
//            if (err) {
//                debug("Unable to satisfy request for packets. Reason", err);
//                res.status(400).json(auxtools.fromError(400, err));
//            } else {
//                debug("# of packets=", packet_array.length);
//                res.json(packet_array);
//            }
//        });
//    }
//});
//
//// RESTful interface that listens for incoming loop packets and then
//// stores them in the MongoDB database
//router.post('/streams/:streamID/packets', function (req, res) {
//    // Make sure the incoming packet is encoded in JSON.
//    if (req.is('json')) {
//        // Get the streamID
//        var streamID = req.params.streamID;
//        // Get the packet out of the request body:
//        var packet = req.body;
//        // Insert the packet into the database
//        stream_manager.insertOne(streamID, packet, function (err, result) {
//            if (err) {
//                if (err.code === undefined) {
//                    // Not a MongoDB error.
//                    res.status(400).json(auxtools.fromError(400, err));
//                } else if (err.code === 11000) {
//                    // MongoDB duplicate key error
//                    debug("Attempt to insert packet with duplicate time stamp");
//                    err.description = "Duplicate time stamp";
//                    res.status(409).json(auxtools.fromError(409, err));
//                } else {
//                    // Other database error
//                    debug("Error code:", err.code, "error message:", err.message);
//                    err.description = "Unable to insert packet";
//                    res.status(400).json(auxtools.fromError(400, err));
//                }
//            } else {
//                var resource_url = auxtools.resourcePath(req, packet.timestamp);
//                res.status(201).location(resource_url).json(packet);
//                // Let any interested subscribers know there is a new packet:
//                pubsub.publish('new_packet', {"packet": packet, "streamID": streamID}, this);
//            }
//        });
//    } else {
//        res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
//    }
//});
//
//// RESTful interface for requesting packet with a specific timestamp
//router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
//    // Get the streamID and timestamp out of the route path
//    var streamID  = req.params.streamID;
//    var timestamp = req.params.timestamp;
//    debug("Request for packet with timestamp", timestamp);
//
//    stream_manager.findOne(streamID, {timestamp: timestamp}, function (err, packet) {
//        if (err) {
//            debug("Unable to satisfy request. Reason", err);
//            res.status(400).json(auxtools.fromError(400, err));
//        } else {
//            if (packet === null) res.sendStatus(404);
//            else res.json(packet);
//        }
//    });
//});
//
//// Delete a specific packet
//router.delete('/streams/:streamID/packets/:timestamp', function (req, res) {
//    // Get the streamID and timestamp out of the route path
//    var streamID  = req.params.streamID;
//    var timestamp = req.params.timestamp;
//    debug("Request to delete timestamp", timestamp);
//
//    stream_manager.deleteOne(streamID, {timestamp: timestamp}, function (err, result) {
//        if (err) {
//            debug("Unable to satisfy request. Reason", err);
//            res.status(400).json(auxtools.fromError(400, err));
//        } else {
//            var status = result.result.n ? 204 : 404;
//            res.sendStatus(status);
//        }
//    });
//});

    return router;

};

module.exports = StreamRoutes;
