/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// Config information for the MongoDB server
module.exports = {
    // URL to the MongoDB database to be used:
    url: "mongodb://localhost:27017/weert",

    // Options to be used for the streams metadata collection
    streams: {
        metadata_name: 'streams_metadata',
        options      : {
            strict: true
        }
    },

    // Options to be used for the platform metadata collection
    platforms: {
        metadata_name: 'platforms_metadata',
        options      : {
            strict: true
        }
    },

    // Options to be used for the collections holding packet data
    packets: {
        name   : function (streamID) {
            return "streams_" + streamID + "_packets"
        },
        options: {
            strict: true,
            capped: true,
            size  : 1000000,
            max   : 3600
        }
    }

};