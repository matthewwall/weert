var debug   = require('debug')('weert:server');
var express = require('express');
var router  = express.Router();

var pubsub   = require('../pubsub');
var auxtools = require('../auxtools');

var streams_manager = undefined;

// RESTful interface that creates a new stream
router.post('/streams', function (req, res) {
    "use strict";
    if (req.is('json')) {
        // Get the metadata
        var metadata = req.body;
        streams_manager.createStream(metadata, function (err, result) {
            if (err) {
                err.code = 400;
                res.status(400).json(err);
            } else {
                var resource_url = auxtools.resourcePath(req, result._id);
                res.status(201).location(resource_url).json(result);
            }
        })
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
    }

});

// RESTful interface that returns references to all streams
router.get('/streams', function (req, res) {
    "use strict";
    streams_manager.findStreams(req.query, function (err, streams_array) {
        if (err) {
            debug("Unable to find streams. Reason", err);
            res.status(400).json({code:400, message: err.message});
        } else {
            debug("# of streams=", streams_array.length);
            var stream_uris = [];
            for (var i = 0; i < streams_array.length; i++) {
                stream_uris[i] = auxtools.resourcePath(req, streams_array[i]._id);
            }
            res.json(stream_uris);
        }

    });
});

// RESTful interface that returns the metadata for a single stream
router.get('/streams/:streamID', function (req, res) {
    "use strict";
    // Get the streamID out of the route path
    var streamID = req.params.streamID;
    debug("Request for streamID", streamID);

    streams_manager.findStream(streamID, function (err, stream_metadata) {
        if (err) {
            debug("Unable to satisfy request. Reason", err);
            err.code = 400;
            res.status(400).json(err);
            console.log("Bad stream ID", err);
        } else {
            if (stream_metadata.length) {
                res.json(stream_metadata[0]);
            } else {
                res.sendStatus(404);
            }
        }
    });

});

// RESTful interface for requesting packets or an aggregation from a stream, which
// satisfies a search query.
router.get('/streams/:streamID/packets', function (req, res) {
    // Get the streamID out of the route path
    var streamID = req.params.streamID;
    // Is an aggregation being requested?
    if (req.query.aggregate_type !== undefined) {
        // Yes, an aggregation is being requested.
        debug("Request for aggregation", req.query.aggregate_type,
            "with start, stop times of", req.query.start, req.query.stop);
        var obs_type = req.query.obs_type;
        streams_manager.aggregate(streamID, obs_type, req.query, function (err, result) {
            if (err) {
                debug("Unable to satisfy aggregation request. Reason", err);
                err.code = 400;
                res.status(400).json(err);
            } else {
                res.json(result);
            }
        });
    } else {
        debug("Request for packets with start, stop times of", req.query.start, req.query.stop);
        streams_manager.find(streamID, req.query, function (err, packet_array) {
            if (err) {
                debug("Unable to satisfy request for packets. Reason", err);
                res.status(400).json({code: 400, message: err.message});
            } else {
                debug("# of packets=", packet_array.length);
                res.json(packet_array);
            }
        });
    }
});

// RESTful interface that listens for incoming loop packets and then
// stores them in the MongoDB database
router.post('/streams/:streamID/packets', function (req, res) {
    // Make sure the incoming packet is encoded in JSON.
    if (req.is('json')) {
        // Get the streamID
        var streamID = req.params.streamID;
        // Get the packet out of the request body:
        var packet = req.body;
        // Insert the packet into the database
        streams_manager.insertOne(streamID, packet, function (err, result) {
            if (err) {
                if (err.code === undefined){
                    // Not a MongoDB error.
                    res.status(400).json({code: 400, message: err.message});
                } else if (err.code === 11000) {
                    // MongoDB duplicate key error
                    debug("Attempt to insert packet with duplicate time stamp");
                    res.status(409).json({code: 409, message: "Duplicate time stamp", description: err.message});
                } else {
                    // Other database error
                    debug("Error code:", err.code, "error message:", err.message);
                    res.status(400).json({code: 400, message: "Unable to insert packet", description: err.message});
                }
            } else {
                var resource_url = auxtools.resourcePath(req, packet.timestamp);
                res.status(201).location(resource_url).json(packet);
                // Let any interested subscribers know there is a new packet:
                pubsub.publish('new_packet', {"packet": packet, "streamID": streamID}, this);
            }
        });
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
    }
});

// RESTful interface for requesting packet with a specific timestamp
router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
    // Get the streamID and timestamp out of the route path
    var streamID  = req.params.streamID;
    var timestamp = req.params.timestamp;
    debug("Request for timestamp", timestamp);

    streams_manager.findOne(streamID, {timestamp: timestamp}, function (err, packet) {
        if (err) {
            debug("Unable to satisfy request. Reason", err);
            res.status(400).json({code: 400, message: "Unable to satisfy request", description: err.message});
        } else {
            if (packet === null) res.sendStatus(404);
            else res.json(packet);
        }
    });
});

// Delete a specific packet
router.delete('/streams/:streamID/packets/:timestamp', function (req, res) {
    // Get the streamID and timestamp out of the route path
    var streamID  = req.params.streamID;
    var timestamp = req.params.timestamp;
    debug("Request to delete timestamp", timestamp);

    streams_manager.deleteOne(streamID, {timestamp: timestamp}, function (err, result) {
        if (err) {
            debug("Unable to satisfy request. Reason", err);
            res.status(400).json({code: 400, message: "Unable to satisfy request", description: err.message});
        } else {
            var status = result.result.n ? 204 : 404;
            res.sendStatus(status);
        }
    });
});

module.exports = function (sm) {
    streams_manager = sm;
    return router;
};
