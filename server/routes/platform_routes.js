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
            debug("Request to create stream has _id field:", metadata._id);
            res.status(400).json({
                code   : 400,
                message: "Request to create a stream must not include an _id field",
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

module.exports = function (pm) {
    platforms_manager = pm;
    return router;
};

