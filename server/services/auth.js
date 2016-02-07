/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Sample authorization schemes
 */

Promise = require('bluebird');

/************* Insecure authorization. Allows everything ********************/

var insecure = function (usergroup, verb, endpoint) {
    return Promise.resolve(true);
};

/*********** Simple authorization. More of an example ***********************/

groups = {
    'admin': {'DELETE': true, 'POST': true, 'PUT': true, 'GET': true},
    'field': {'DELETE': false, 'POST': true, 'PUT': true, 'GET': true}
};

// Matches URLs of the form '/streams/:streamID/packets', where streamID is a hexadecimal number
re_packet = new RegExp('^/?streams/[0-9a-f]+/packets/?$');
// Matches URLs of the form '/platforms/:platformID/locations', where platformID is a hexadecimal number
re_location = new RegExp('^/?platforms/[0-9a-f]+/locations/?$');

var simple = function (usergroup, verb, endpoint) {

    return new Promise(function (resolve, reject) {

        // Everyone has 'GET' access
        if (verb === 'GET')
            return resolve(true);

        // The group 'datastream' can only post packets or locations
        if (usergroup === 'datastream') {
            if (verb === 'POST' && (re_packet.test(endpoint)) || re_location.test(endpoint))
                return resolve(true);
            else
                return resolve(false);
        }

        // Special groups, with explicit permission matrix
        if (usergroup in groups && verb in groups[usergroup]) {
            if (groups[usergroup][verb])
                return resolve(true);
            else
                return resolve(false);
        } else {
            return reject(new Error("Unknown usergroup or verb"))
        }
    });
};

module.exports = {
    insecure: insecure,
    simple  : simple
};