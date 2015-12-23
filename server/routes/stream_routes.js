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

var StreamRouterFactory = function (stream_manager) {

    var router = express.Router();

    // Create a new stream
    router.post('/streams', function (req, res) {
        if (req.is('json')) {
            // Get the stream metadata
            var metadata = req.body;
            stream_manager
                .createStream(metadata)
                .then(function (result) {
                    // Get the new stream's URI and return it in the location header
                    var resource_url = auxtools.resourcePath(req, result._id);
                    res.status(201).location(resource_url).json(result);
                })
                .catch(function (err) {
                    // Unable to create the stream. Send status 400 and a JSON message.
                    res.status(400).json(auxtools.fromError(400, err));
                })
        } else {
            // POST was not in JSON format. Send an error msg.
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }

    });

    // Return an array of URIs to streams that satisfy a query.
    router.get('/streams', function (req, res) {
        var dbQuery;
        // A bad sort direction or limit can cause an exception to be raised:
        try {
            dbQuery = auxtools.formListQuery(req.query);
        }
        catch (err) {
            err.description = req.query;
            debug("Unable to find streams. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
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


    // GET the metadata for a single stream
    router.get('/streams/:streamID', function (req, res) {
        // Get the streamID out of the route path
        var streamID = req.params.streamID;
        debug("Request for streamID", streamID);

        stream_manager
            .findStream(streamID)
            .then(function (stream_metadata) {
                // The variable stream_metadata is an array. If it's zero length,
                // that means the stream could not be found.
                if (stream_metadata.length) {
                    res.json(stream_metadata[0]);
                } else {
                    res.sendStatus(404);    // Status 404 Resource Not Found
                }
            })
            .catch(function (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            });
    });

    // POST a single packet to the MongoDB database
    router.post('/streams/:streamID/packets', function (req, res) {
        // Make sure the incoming packet is encoded in JSON.
        if (req.is('json')) {
            // Get the streamID
            var streamID = req.params.streamID;
            // Get the packet out of the request body:
            var packet = req.body;
            // Insert the packet into the database
            stream_manager
                .insertOnePacket(streamID, packet)
                .then(function (result) {
                    var resource_url = auxtools.resourcePath(req, result.timestamp);
                    res.status(201).location(resource_url).json(result);
                })
                .catch(function (err) {
                    if (err.code === undefined) {
                        // Not a MongoDB error.
                        res.status(400).json(auxtools.fromError(400, err));
                    } else if (err.code === 11000) {
                        // MongoDB duplicate key error
                        debug("Attempt to insert packet with duplicate time stamp");
                        err.description = "Duplicate time stamp";
                        res.status(409).json(auxtools.fromError(409, err));
                    } else {
                        // Other database error
                        debug("Error code:", err.code, "error message:", err.message);
                        err.description = "Unable to insert packet";
                        res.status(400).json(auxtools.fromError(400, err));
                    }
                });
        } else {
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }
    });


    // GET all packets or an aggregation from a stream, which
    // satisfies a search query.
    router.get('/streams/:streamID/packets', function (req, res) {
        // Get the streamID out of the route path
        var streamID = req.params.streamID;
        var dbQuery;
        try {
            dbQuery = auxtools.formSpanQuery(req.query);
        }
        catch (err) {
            err.description = req.query;
            debug("Unable to find packets. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
        }

        // Is an aggregation being requested?
        if (req.query.aggregate_type !== undefined) {
            // Yes, an aggregation is being requested.
            debug("Request for aggregation", req.query.aggregate_type,
                "with start, stop times of", req.query.start, req.query.stop);
            dbQuery.aggregate_type = req.query.aggregate_type;
            var obs_type           = req.query.obs_type;
            stream_manager
                .aggregatePackets(streamID, obs_type, dbQuery)
                .then(function (result) {
                    res.json(result);
                })
                .catch(function (err) {
                    debug("Unable to satisfy aggregation request. Reason", err);
                    res.status(400).json(auxtools.fromError(400, err));
                });
        } else {
            debug("Request for packets with start, stop times of", req.query.start, req.query.stop);
            stream_manager
                .findPackets(streamID, dbQuery)
                .then(function (packet_array) {
                    debug("# of packets=", packet_array.length);
                    res.json(packet_array);
                })
                .catch(function (err) {
                    debug("Unable to satisfy request for packets. Reason", err);
                    res.status(400).json(auxtools.fromError(400, err));
                });
        }
    });


    // GET a packet with a specific timestamp
    router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
        // Get the streamID and timestamp out of the route path
        var streamID  = req.params.streamID;
        var dbQuery;
        try {
            dbQuery = auxtools.formTimeQuery(req.params);
        }
        catch (err) {
            err.description = req.query;
            debug("Unable to find packet. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
        }
        debug("Request for packet with timestamp", dbQuery.timestamp);

        stream_manager
            .findOnePacket(streamID, dbQuery)
            .then(function (packet) {
                if (packet === null) res.sendStatus(404);
                else res.json(packet);
            })
            .catch(function (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            })
    });

    // DELETE a specific packet
    router.delete('/streams/:streamID/packets/:timestamp', function (req, res) {
        // Get the streamID and timestamp out of the route path
        var streamID  = req.params.streamID;
        var dbQuery;
        try {
            dbQuery = auxtools.formTimeQuery(req.params);
        }
        catch (err) {
            err.description = req.query;
            debug("Unable to delete packets. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
        }
        debug("Request to delete packet at timestamp", dbQuery.timestamp);

        stream_manager
            .deleteOnePacket(streamID, dbQuery)
            .then(function (result) {
                var status = result.result.n ? 204 : 404;
                res.sendStatus(status);
            })
            .catch(function (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));

            })
    });

    return router;

};

module.exports = StreamRouterFactory;
