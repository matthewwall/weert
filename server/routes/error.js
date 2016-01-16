/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

var debug    = require('debug')('weert:server');
var auxtools = require('../auxtools');

var sendError = function (err, res) {
    if (err.name === "MongoError") {
        // MongoDB error
        if (err.message.includes("ECONNREFUSED")) {
            err.description = "Perhaps MongoDB is not running?";
            res.status(500).json(auxtools.fromError(500, err));
        } else if (err.message.includes("does not exist. Currently in strict mode")) {
            res.sendStatus(404);
        } else if (err.code === 11000) {
            // MongoDB duplicate key error
            debug("Duplicate key error");
            err.description = "Duplicate key error";
            res.status(409).json(auxtools.fromError(409, err));
        } else {
            // Other database error
            debug("Error code:", err.code, "error message:", err.message);
            res.status(400).json(auxtools.fromError(400, err));
        }
    } else {
        // Not a MongoDB error.
        res.status(400).json(auxtools.fromError(400, err));
    }
}

module.exports = {
    sendError: sendError
}