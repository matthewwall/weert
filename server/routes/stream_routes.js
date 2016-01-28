/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Stream-related routes
 *
 * Mutating RESTful verbs (POST, PUT, DELETE) cause an event to be emitted.
 */

"use strict";

var debug   = require('debug')('weert:server');
var express = require('express');

var auxtools = require('../auxtools');
var error    = require('./error');

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
                    // Emit an event
                    res.app.emit('streams/POST', result);
                })
                .catch(function (err) {
                    error.sendError(err, res);
                });
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
            debug("Bad query. Reason", err);
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
                error.sendError(err, res);
            });
    });


    // GET the metadata for a single stream
    router.get('/streams/:streamID', function (req, res) {
        // Get the streamID out of the route path
        var streamID = req.params.streamID;
        debug("GET for streamID", streamID);

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
                debug("Unable to satisfy GET metadata request. Reason", err);
                error.sendError(err, res);
            });
    });

    // PUT (Update) the metadata for a stream
    router.put('/streams/:streamID', function (req, res) {
        if (req.is('json')) {
            // Get the streamID
            var streamID = req.params.streamID;
            debug("PUT to streamID", streamID);

            // Get the platform metadata
            var metadata = req.body;

            // Ask the StreamManager to update the platform metadata
            stream_manager
                .updateStream(streamID, metadata)
                .then(function (result) {
                    if (result.result.n) {
                        // Success
                        res.sendStatus(204);
                        // Emit an event
                        res.app.emit('streams/PUT', metadata);
                    } else {
                        // Couldn't find the doc
                        res.sendStatus(404);
                    }
                })
                .catch(function (err) {
                    error.sendError(err, res);
                });
        } else {
            // POST was not in JSON format. Send an error msg.
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }
    });


    // POST a single packet to a stream
    router.post('/streams/:streamID/packets', function (req, res) {
        // Make sure the incoming packet is encoded in JSON.
        if (req.is('json')) {
            // Get the streamID
            var streamID = req.params.streamID;
            // Get the packet out of the request body:
            var packet = req.body;
            // Insert the packet into the database
            stream_manager
                .insertPacket(streamID, packet)
                .then(function (result) {
                    var resource_url = auxtools.resourcePath(req, result.timestamp);
                    res.status(201).location(resource_url).json(result);
                    // Emit an event
                    res.app.emit('streams/packets/POST', {_id: streamID, packet: result});
                })
                .catch(function (err) {
                    error.sendError(err, res);
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
            debug("Bad query for getting packets from stream. Reason", err);
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
                    error.sendError(err, res);
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
                    error.sendError(err, res);
                });
        }
    });


    // GET the last packet in a stream
    router.get('/streams/:streamID/packets/latest', function (req, res) {
        // Get the streamID and timestamp out of the route path
        var streamID = req.params.streamID;
        debug("Request for last packet in stream", streamID);

        stream_manager
            .findPacket(streamID, {query: {}, sort: {_id: -1}})
            .then(function (packet) {
                if (packet === null) res.sendStatus(404);
                else {
                    // They asked for the 'latest' packet. Calculate its actual URL,
                    // and include it in the Location response header.
                    var replaceUrl   = req.originalUrl.replace('latest', packet.timestamp);
                    var resource_url = auxtools.locationPath(replaceUrl, req.protocol, req.get('host'), '');
                    res.status(200).location(resource_url).json(packet);
                }
            })
            .catch(function (err) {
                debug("Unable to satisfy request for latest packet in", streamID, ". Reason", err);
                error.sendError(err, res);
            })
    });


    // GET a packet with a specific timestamp
    router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
        // Get the streamID and timestamp out of the route path
        var streamID = req.params.streamID;
        var dbQuery;
        try {
            if (req.query.match === undefined)
                req.query.match = 'exact';
            dbQuery = auxtools.formTimeQuery(req.params, req.query);
        }
        catch (err) {
            err.description = req.query;
            debug("Bad query for requesting packet. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
        }
        debug("Request for packet with timestamp", dbQuery.timestamp, "with match", req.query.match);

        stream_manager
            .findPacket(streamID, dbQuery)
            .then(function (packet) {
                if (packet === null)
                    res.sendStatus(404);
                else {
                    // Calculate the actual URL of the returned packet
                    // and include it in the Location response header.
                    var replaceUrl   = req.originalUrl.replace(req.params.timestamp, packet.timestamp);
                    var resource_url = auxtools.locationPath(replaceUrl, req.protocol, req.get('host'), '');
                    res.status(200).location(resource_url).json(packet);
                }
            })
            .catch(function (err) {
                debug("Unable to satisfy request for packet. Reason", err);
                error.sendError(err, res);
            })
    });

    // DELETE a specific packet
    router.delete('/streams/:streamID/packets/:timestamp', function (req, res) {
        // Get the streamID and timestamp out of the route path
        var streamID = req.params.streamID;
        var dbQuery;
        try {
            dbQuery = auxtools.formTimeQuery(req.params, {match: 'exact'});
        }
        catch (err) {
            err.description = req.query;
            debug("Bad query for deleting packet. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
            return;
        }
        debug("Request to delete packet at timestamp", dbQuery.timestamp);

        stream_manager
            .deletePacket(streamID, dbQuery)
            .then(function (result) {
                // The property 'n' holds the number of documents deleted
                if (result.result.n) {
                    // Success.
                    res.sendStatus(204);
                    // Emit an event
                    res.app.emit('streams/packets/DELETE', {_id: streamID, timestamp: dbQuery.timestamp});
                } else {
                    // Couldn't find the doc
                    res.sendStatus(404);
                }
            })
            .catch(function (err) {
                debug("Unable to satisfy request to delete packet. Reason", err);
                error.sendError(err, res);
            })
    });

    return router;

};

module.exports = StreamRouterFactory;
