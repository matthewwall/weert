"use strict";

var debug   = require('debug')('weert:server');
var express = require('express');
var router  = express.Router();

var pubsub   = require('../pubsub');
var auxtools = require('../auxtools');

var platforms_manager = undefined;

// Create a new platform
router.post('/platforms', function (req, res) {
    if (req.is('json')) {
        // Get the metadata
        var metadata = req.body;
        platforms_manager.createPlatform(metadata, function (err, result) {
            if (err) {
                res.status(400).json(auxtools.fromError(400, err));
            }
            var resource_url = auxtools.resourcePath(req, result._id);
            res.status(201).location(resource_url).json(result);
        })
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
    }
});

// Return the URIs of all platforms
router.get('/platforms', function (req, res) {
    platforms_manager.findPlatforms(req.query, function (err, platforms_array) {
        if (err) {
            debug("Unable to find platforms. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
        } else {
            debug("# of platforms=", platforms_array.length);
            var platform_uris = [];
            for (var i = 0; i < platforms_array.length; i++) {
                platform_uris[i] = auxtools.resourcePath(req, platforms_array[i]._id);
            }
            res.json(platform_uris);
        }

    });
});

// Get the metadata for a single platform
router.get('/platforms/:platformID', function (req, res) {
    // Get the platformID out of the route path
    var platformID = req.params.platformID;
    debug("Request for platformID", platformID);

    platforms_manager.findPlatform(platformID, function (err, platform_metadata) {
        if (err) {
            debug("Unable to satisfy request. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
        } else {
            if (platform_metadata.length) {
                res.json(platform_metadata[0]);
            } else {
                res.sendStatus(404);
            }
        }
    });
});

router.post('/platforms/:platformID/locations', function (req, res) {
    // Make sure the incoming packet is encoded in JSON.
    if (req.is('json')) {
        // Get the platformID
        var platformID = req.params.platformID;
        // Get the location record out of the request body:
        var locrec = req.body;
        // Insert the location record into the database
        platforms_manager.createLocationRecord(platformID, locrec, function (err, result) {
            if (err) {
                if (err.code === undefined) {
                    // Not a MongoDB error.
                    res.status(400).json(auxtools.fromError(400, err));
                } else if (err.code === 11000) {
                    // MongoDB duplicate key error
                    debug("Attempt to insert location record with duplicate time stamp");
                    err.description = "Duplicate time stamp";
                    res.status(409).json(auxtools.fromError(409, err));
                } else {
                    // Other database error
                    debug("Error code:", err.code, "error message:", err.message);
                    err.description = "Unable to insert location record";
                    res.status(400).json(auxtools.fromError(400, err));
                }
            } else {
                var resource_url = auxtools.resourcePath(req, locrec.timestamp);
                res.status(201).location(resource_url).json(locrec);
                // Let any interested subscribers know there is a new location record:
                pubsub.publish('new_location_record', {"location_record": locrec, "platformID": platformID}, this);
            }
        });
    } else {
        res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
    }
});

router.get('/platforms/:platformID/locations', function (req, res) {
    // Get the platformID out of the route path
    var platformID = req.params.platformID;
    debug("Request for location records with start, stop times of", req.query.start, req.query.stop);
    platforms_manager.findLocationRecords(platformID, req.query, function (err, locrec_array) {
        if (err) {
            debug("Unable to satisfy request for location records. Reason", err);
            res.status(400).json(auxtools.fromError(400, err));
        } else {
            debug("# of locrecs=", locrec_array.length);
            res.json(locrec_array);
        }
    });
});

module.exports = function (pm) {
    platforms_manager = pm;
    return router;
};

