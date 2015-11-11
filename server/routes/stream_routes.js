var debug        = require('debug')('weert:server');
var url          = require('url');
var express      = require('express');
var router       = express.Router();
var normalizeUrl = require('normalize-url');

var pubsub = require('../pubsub');

var streams_manager = undefined;

// RESTful interface that returns references to all streams
router.get('/streams', function (req, res) {
    "use strict";
    streams_manager.findStreams(req.query, function (err, streams_array) {
        if (err) {
            debug("Unable to find streams. Reason", err);
            res.status(400).send({code: 400, message: "Unable to satisfy request for streams", error: err.message});
        } else {
            debug("# of streams=", streams_array.length);
            var stream_uris = [];
            for (var i = 0; i < streams_array.length; i++) {
                stream_uris[i] = url.format({
                    protocol: req.protocol,
                    host    : req.get('host'),
                    pathname: req.originalUrl + "/" + streams_array[i]._id
                });
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
            console.log("Unable to satisfy request. Reason", err);
            res.status(400).json({
                code   : 400,
                message: "Unable to satisfy request for stream with _id " + streamID,
                error  : err.message
            });
        } else {
            if (stream_metadata.length) {
                res.json(stream_metadata[0]);
            } else {
                res.json(null);
            }
        }
    });

});

// RESTful interface that creates a new stream
router.post('/streams', function (req, res) {
    "use strict";
    if (req.is('json')) {
        // Get the metadata
        var metadata = req.body;
        // Make sure it does not contain an _id field:
        if (metadata._id !== undefined) {
            debug("Request to create stream has _id field:", metadata._id);
            res.status(400).json({
                code   : 400,
                message: "Request to create a stream must not include an _id field",
                error  : {field: "_id", "message": "Cannot be included"}
            });
        } else {
            streams_manager.createStream(metadata, function (err, result) {
                var resource_url = url.format({
                    protocol: req.protocol,
                    host    : req.get('host'),
                    pathname: req.originalUrl + "/" + result._id
                });
                res.status(201).location(normalizeUrl(resource_url)).json(result);
            })
        }
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", error: req.get('Content-Type')});
    }

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
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json({code: 400, message: "Unable to satisfy request", error: err.message});
            } else {
                res.json(result);
            }
        });
    } else {
        debug("Request for packets with start, stop times of", req.query.start, req.query.stop);
        streams_manager.find(streamID, req.query, function (err, packet_array) {
            if (err) {
                debug("Unable to satisfy request for packets. Reason", err);
                res.status(400).json({code: 400, message: "Unable to satisfy request for packets", error: err.message});
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
        var ts     = new Date(packet.timestamp);
        // Insert it into the database
        streams_manager.insertOne(streamID, packet, function (err, result) {
            // Send back an appropriate acknowledgement:
            if (err) {
                debug("Unable to insert packet with timestamp", ts);
                if (err.code === 11000) {
                    debug("Reason: duplicate time stamp");
                    res.status(409).json({code: 409, message: "Duplicate time stamp", error: err.message});
                } else {
                    debug("Error code:", err.code, "error message:", err.message);
                    res.status(400).json({code: 400, message: "Unable to insert packet", error: err.message});
                }
            } else {
                var resource_url = url.format({
                    protocol: req.protocol,
                    host    : req.get('host'),
                    pathname: req.originalUrl + "/" + packet.timestamp
                });
                res.status(201).location(normalizeUrl(resource_url)).json(packet);
                // Let any interested subscribers know there is a new packet:
                pubsub.publish('new_packet', {"packet": packet, "streamID": streamID}, this);
            }
        });
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", error: req.get('Content-Type')});
    }
});

// RESTful interface for requesting packet with a specific timestamp
router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
    // Get the streamID out of the route path
    var streamID  = req.params.streamID;
    var timestamp = req.params.timestamp;
    debug("Request for timestamp", timestamp);

    streams_manager.findOne(streamID, {timestamp: timestamp}, function (err, packet) {
        if (err) {
            console.log("Unable to satisfy request. Reason", err);
            res.status(400).json({code: 400, message: "Unable to satisfy request", error: err.message});
        } else {
            res.json(packet);
        }
    });
});

module.exports = function (sm) {
    streams_manager = sm;
    return router;
};
