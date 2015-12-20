/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var debug   = require('debug')('weert:server');
var express = require('express');

var auxtools = require('../auxtools');

var PlatformRoutes = function (platform_manager) {

    var router  = express.Router();


    // Create a new platform
    router.post('/platforms', function (req, res) {
        if (req.is('json')) {
            // Get the platform metadata
            var metadata = req.body;
            // Ask the PlatformManager to create the new platform.
            platform_manager.createPlatform(metadata, function (err, result) {
                if (err) {
                    // Unable to create the platform. Send status 400 and a JSON message.
                    res.status(400).json(auxtools.fromError(400, err));
                } else {
                    // All went well. Get the new platform's URI and return it in the location header
                    var resource_url = auxtools.resourcePath(req, result._id);
                    res.status(201).location(resource_url).json(result);
                }
            })
        } else {
            // POST was not in JSON format. Send an error msg.
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }
    });

    // Return an array of URIs to platforms that satisfy a query.
    router.get('/platforms', function (req, res) {
        // Ask the PlatformManager to find the platforms that satisfy the query
        platform_manager.findPlatforms(req.query, function (err, platforms_array) {
            if (err) {
                debug("Unable to find platforms. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            } else {
                debug("# of platforms=", platforms_array.length);
                var as = req.query.as ? req.query.as : 'links';
                switch (as.toLowerCase()) {
                    case 'values':
                        return res.json(platforms_array);
                    case 'links':
                        var platform_uris = [];
                        for (var i = 0; i < platforms_array.length; i++) {
                            platform_uris[i] = auxtools.resourcePath(req, platforms_array[i]._id);
                        }
                        return res.json(platform_uris);
                    default:
                        debug("Unknown value for 'as':", as);
                        return res.status(400).json({
                            code       : 400,
                            message    : "Invalid query value for 'as'",
                            description: req.query.as
                        });
                }
            }

        });
    });

    // Get the metadata for a single platform
    router.get('/platforms/:platformID', function (req, res) {
        // Get the platformID out of the route path
        var platformID = req.params.platformID;
        debug("Request for platformID", platformID);

        platform_manager.findPlatform(platformID, function (err, platform_metadata) {
            if (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            } else {
                // The variable platform_metadata is an array. If it's zero length,
                // that means the platform could not be found.
                if (platform_metadata.length) {
                    res.json(platform_metadata[0]);
                } else {
                    res.sendStatus(404);    // Status 404 Resource Not Found
                }
            }
        });
    });

    // POST a new location for a specific platform
    router.post('/platforms/:platformID/locations', function (req, res) {
        // Make sure the incoming packet is encoded in JSON.
        if (req.is('json')) {
            // Get the platformID
            var platformID = req.params.platformID;
            // Get the location record out of the request body:
            var locrec = req.body;
            // Insert the location record into the database
            platform_manager.createLocationRecord(platformID, locrec, function (err, result) {
                if (err) {
                    // See if this is a MongoDB error.
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
                    // All went well. Get the URI of the new location record
                    var resource_url = auxtools.resourcePath(req, locrec.timestamp);
                    // Send it back in the location header
                    res.status(201).location(resource_url).json(locrec);
                    // Let any interested subscribers know there is a new location record:
                    pubsub.publish('new_location_record', {"location_record": locrec, "platformID": platformID}, this);
                }
            });
        } else {
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }
    });

    // Get an array of locations for a given platform
    router.get('/platforms/:platformID/locations', function (req, res) {
        // Get the platformID out of the route path
        var platformID = req.params.platformID;
        debug("Request for location records with start, stop times of", req.query.start, req.query.stop);
        platform_manager.findLocationRecords(platformID, req.query, function (err, locrec_array) {
            if (err) {
                debug("Unable to satisfy request for location records. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            } else {
                debug("# of locrecs=", locrec_array.length);
                res.json(locrec_array);
            }
        });
    });

    // Get the location satisfying a time query
    router.get('/platforms/:platformID/locations/:timestamp', function (req, res) {
        // Get the platformID and timestamp out of the route path
        var platformID = req.params.platformID;
        var timestamp  = req.params.timestamp;
        debug("Request for location at timestamp", timestamp);

        platform_manager.location(platformID, timestamp, req.query, function (err, record) {
            if (err) {
                debug("Unable to satisfy request. Reason", err);
                res.status(400).json(auxtools.fromError(400, err));
            } else {
                if (record === null) res.sendStatus(404);
                else res.json(record);
            }
        });
    });

    return router;

};

module.exports = PlatformRoutes;

