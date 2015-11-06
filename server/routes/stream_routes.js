var debug = require('debug')('weert:server');
var url = require('url');
var express = require('express');
var router = express.Router();

var pubsub = require('../pubsub');

var streams_manager = undefined;

// RESTful interface that creates new streams
router.post('/streams', function (req, res) {

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
                res.status(400).send({code: 400, message: "Unable to satisfy request", error: err.message});
            } else {
                res.json(result);
            }
        });
    } else {
        debug("Request for packets with start, stop times of", req.query.start, req.query.stop);
        streams_manager.find(streamID, req.query, function (err, packet_array) {
            if (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).send({code: 400, message: "Unable to satisfy request", error: err.message});
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
        var packet = req.body.packet;
        var ts = new Date(packet.timestamp);
        // Insert it into the database
        streams_manager.insertOne(streamID, packet, function (err, result) {
            // Send back an appropriate acknowledgement:
            if (err) {
                debug("Unable to insert packet with timestamp", ts);
                if (err.code === 11000) {
                    debug("Reason: duplicate time stamp");
                    res.status(409).json({code: 409, message: "Duplicate time stamp", error: err.message});
                } else {
                    debug("Error code:", err.code);
                    res.status(400).json({code: 400, message: "Unable to insert packet", error: err.message});
                }
            } else {
                var resource_url = url.format({
                    protocol: req.protocol,
                    host: req.get('host'),
                    pathname: req.originalUrl + "/" + packet.timestamp
                });
                res.status(201).location(resource_url).json(packet.timestamp);
                // Let any interested subscribers know there is a new packet:
                pubsub.publish('new_packet', {"packet": packet, "streamID": streamID}, this);
            }
        });
    } else {
        res.status(415).json({code:415, message:"Invalid Content-type", error: req.get('Content-Type')});
    }
});

// RESTful interface for requesting packet with a specific timestamp
router.get('/streams/:streamID/packets/:timestamp', function (req, res) {
    // Get the streamID out of the route path
    var streamID = req.params.streamID;
    var timestamp = req.params.timestamp;
    debug("Request for timestamp", timestamp);

    streams_manager.findOne(streamID, {timestamp: timestamp}, function (err, packet) {
        if (err) {
            console.log("Unable to satisfy request. Reason", err);
            res.status(400).json({code:400, message: "Unable to satisfy request", error: err.message});
        } else {
            res.json(packet);
        }
    });
});

module.exports = function (sm) {
    streams_manager = sm;
    return router;
};
