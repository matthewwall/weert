var debug        = require('debug')('weert:server');
var url          = require('url');
var express      = require('express');
var router       = express.Router();
var normalizeUrl = require('normalize-url');

var platforms_manager = undefined;

// Create a new platform
router.post('/platforms', function (req, res) {
    "use strict";
    if (req.is('json')) {
        // Get the metadata
        var metadata = req.body;
        // Make sure it does not contain an _id field:
        if (metadata._id !== undefined) {
            debug("Request to create platform has _id field:", metadata._id);
            res.status(400).json({
                code   : 400,
                message: "Request to create a platform must not include an _id field",
                error  : {field: "_id", "message": "Cannot be included"}
            });
        } else {
            platforms_manager.createPlatform(metadata, function (err, result) {
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

// Return the URIs of all platforms
router.get('/platforms', function (req, res) {
    "use strict";
    platforms_manager.findPlatforms(req.query, function (err, platforms_array) {
        if (err) {
            debug("Unable to find platforms. Reason", err);
            res.status(400).send({code: 400, message: "Unable to satisfy request for platforms", error: err.message});
        } else {
            debug("# of platforms=", platforms_array.length);
            var platform_uris = [];
            for (var i = 0; i < platforms_array.length; i++) {
                platform_uris[i] = url.format({
                    protocol: req.protocol,
                    host    : req.get('host'),
                    pathname: req.originalUrl + "/" + platforms_array[i]._id
                });
            }
            res.json(platform_uris);
        }

    });
});

// Get the metadata for a single platform
router.get('/platforms/:platformID', function (req, res) {
    "use strict";
    // Get the platformID out of the route path
    var platformID = req.params.platformID;
    debug("Request for platformID", platformID);

    platforms_manager.findPlatform(platformID, function (err, platform_metadata) {
        if (err) {
            console.log("Unable to satisfy request. Reason", err);
            res.status(400).json({
                code   : 400,
                message: "Unable to satisfy request for platform with _id " + platformID,
                error  : err.message
            });
        } else {
            if (platform_metadata.length) {
                res.json(platform_metadata[0]);
            } else {
                res.sendStatus(404);
            }
        }
    });

});


module.exports = function (pm) {
    platforms_manager = pm;
    return router;
};

