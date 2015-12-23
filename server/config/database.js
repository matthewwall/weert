/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

// Config information for the MongoDB server
module.exports = {
    // URL to the MongoDB database to be used:
    url: "mongodb://localhost:27017/weert",

    // Options to be used for the streams metadata collection
    streams: {
        metadata_name: 'streams_metadata',
        options      : {
            strict: false
        }
    },

    // Options to be used for the platform metadata collection
    platforms: {
        metadata_name: 'platforms_metadata',
        options      : {
            strict: false
        }
    },

    // Options to be used for the collections holding packet data
    packets: {
        name   : function (streamID) {
            return "streams_" + streamID + "_packets"
        },
        options: {
            strict: false,
            capped: true,
            size  : 1000000,
            max   : 3600
        }
    },

    // Options to be used for the collections holding location data
    locrecs: {
        name   : function (platformID) {
            return "platforms_" + platformID + "_locations"
        },
        options: {
            strict: false,
            capped: true,
            size  : 1000000,
            max   : 3600
        }
    }
};