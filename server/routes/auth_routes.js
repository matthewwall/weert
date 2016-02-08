/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Authorization-related routes
 *
 */

"use strict";

var debug   = require('debug')('weert:server');
var express = require('express');

var auxtools = require('../auxtools');
var error    = require('./error');
var errors   = require('../errors');

var AuthorizationRouterFactory = function () {

    var router = express.Router();

    // Create a new JWT
    router.post('/admin/users', function (req, res) {
        if (req.is('json')) {
            var password  = req.body.password;
            var user      = req.body.user;
            var usergroup = req.body.usergroup;


        } else {
            // POST was not in JSON format. Send an error msg.
            res.status(415).json({code: 415, message: "Invalid Content-type", description: req.get('Content-Type')});
        }


        res.status(201).json({jwt: "something"});
    })

    // Return the built router
    return router;

}

module.exports = AuthorizationRouterFactory;


