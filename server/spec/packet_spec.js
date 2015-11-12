/*
 * Test spec for testing the POSTing of packets to a stream.
 */
var frisby       = require('frisby');
var async        = require('async');
var normalizeUrl = require('normalize-url');
// var Client       = require('node-rest-client').Client;

// This is 1-Jan-2015 0000 UTC:
var timestamp = function (i) {
    return 1420070400000 + i * 300000;
};

var temperature = function (i) {
    return 20 - i;
};

var testSinglePacket = function () {
    frisby.create('Create a WeeRT stream to hold a single packet')
        .post('http://localhost:3000/api/v1/streams',
            {
                "name": "Test packet stream",
                "description": "Created to test the insertion of a single packet into a stream"
            },
            {json: true}
        )
        .expectStatus(201)
        .expectHeaderContains('content-type', 'application/json')
        .after(function (error, res, body) {
            "use strict";
            // Successfully created a stream. Now let's try posting into it. First, get the link to the new stream.
            var stream_link = res.headers.location;
            // This is where to POST new packets:
            var stream_packet_link = normalizeUrl(stream_link + '/packets');

            // POST a single packet
            frisby.create("POST a single packet")
                .post(stream_packet_link,
                    {
                        timestamp: timestamp(0),
                        outside_temperature: temperature(0)
                    },
                    {json: true}
                )
                .expectStatus(201)
                .expectHeaderContains('content-type', 'application/json')
                .expectJSON('',
                    {
                        timestamp: timestamp(0),
                        outside_temperature: temperature(0)
                    })
                .after(function (error, res, body) {
                    // We've POSTed a packet. Now try to retrieve it:
                    var packet_link = normalizeUrl(stream_packet_link + '/' + timestamp(0));
                    frisby.create("GET a single packet")
                        .get(packet_link)
                        .expectStatus(200)
                        .expectHeaderContains('content-type', 'application/json')
                        .expectJSON('',
                            {
                                timestamp: timestamp(0),
                                outside_temperature: temperature(0)
                            })
                        .after(function (error, res, body) {
                            // We've retrieved it. Now delete it.
                            frisby.create("DELETE a single packet")
                                .delete(packet_link)
                                .expectStatus(204)
                                .after(function (error, res, body) {
                                    // Now make sure it is really deleted.
                                    frisby.create("Get a non-existent packet")
                                        .get(packet_link)
                                        .expectStatus(404)
                                        .toss();
                                    // Try deleting a non-existing packet
                                    frisby.create("DELETE a non-existing packet")
                                        .delete(packet_link)
                                        .expectStatus(404)
                                        .toss();
                                })
                                .toss();
                        })
                        .toss();
                })
                .toss();
        })
        .toss();
};

var testMultiplePackets = function () {
    "use strict";
    var packets = [];
    for (var i = 0; i < 3; i++) {
        packets[i] = {
            timestamp  : timestamp(i),
            outside_temperature: temperature(i)
        }
    }
    frisby.create('Create a WeeRT stream to hold several packets')
        .post('http://localhost:3000/api/v1/streams',
            {
                "name": "Test multiple packet stream",
                "description": "Created to test the insertion of multiple packets into a stream"
            },
            {json: true}
        )
        .expectStatus(201)
        .expectHeaderContains('content-type', 'application/json')
        .after(function (error, res, body) {
            "use strict";
            // Get the URI for the just created stream resource
            var stream_link        = res.headers.location;
            var stream_packet_link = normalizeUrl(stream_link + '/packets');
            // POST three packets into it
            frisby.create("POST packet #0")
                .post(stream_packet_link,
                    packets[0],
                    {json: true}
                )
                .after(function (error, res, body) {
                    frisby.create("POST packet #1")
                        .post(stream_packet_link,
                            packets[1],
                            {json: true}
                        )
                        .after(function (error, res, body) {
                            frisby.create("POST packet #2")
                                .post(stream_packet_link,
                                    packets[2],
                                    {json: true}
                                )
                                .after(function (error, res, body) {
                                    frisby.create("Retrieve all packets in default order")
                                        .get(stream_packet_link)
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', packets)
                                        .toss();

                                    frisby.create("Retrieve all packets in reverse order")
                                        .get(stream_packet_link + '?direction=desc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', [packets[2], packets[1], packets[0]])
                                        .toss();

                                    frisby.create("Retrieve packets sorted by temperature")
                                        .get(stream_packet_link + '?sort=outside_temperature&direction=asc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', [packets[2], packets[1], packets[0]])
                                        .toss();

                                    frisby.create("Retrieve packets reverse sorted by temperature")
                                        .get(stream_packet_link + '?sort=outside_temperature&direction=desc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', packets)
                                        .toss();
                                })
                                .toss();
                        })
                        .toss();
                })
                .toss();
        })
        .toss();
};
/*
 * The following was an attempt to launch 10 POSTs, then check them all. Unfortunately, I could not
 * get Frisby to work inside a "describe" block. So, then I tried the NPM library node-rest-client,
 * but it has a bug that causes it to misinterpret returned JSON data as binary data.  Gave up.
 */
//describe("Launch " + N + " POSTs", function () {
//    var results_finished = false;
//    var results_successful = undefined;
//    it("Should launch " + N + " POSTS", function () {
//
//        // Run a function which will asynchronously launch N POSTs
//        runs(function () {
//            async.each(indices, function (i, callback) {
//
//                // For reasons that are not clear to me, I can't get Frisby to work within this 'describe'
//                // block. So, use a simple client code.
//                var client = new Client();
//
//                // set content-type header and data as json in args parameter
//                var args = {
//                    data   : {
//                        timestamp  : timestamp(i),
//                        temperature: temperature(i)
//                    },
//                    headers: {
//                        "Content-Type": "application/json"
//                    }
//                };
//
//                client.post(stream_packet_link, args, function (data, response) {
//                    // If the response code is anything other than 201, then we've failed.
//                    if (response.statusCode !== 201)
//                        return callback(response.statusCode);
//
//
//                    // Otherwise, press on by checking to make sure the packet actually got recorded.
//                    var packet_link = normalizeUrl(stream_packet_link + '/' + args.data.timestamp);
//                    client.get(packet_link, {}, function(data, response){
//                        console.log("i=", i, "data=",data);
//                        var json_response = JSON.stringify(data);
//                        console.log("JSON=", json_response);
//                        return callback(null);
//                    });
//
//                });
//
//            }, function (err) {
//                results_finished = true;
//                results_successful = err;
//            });
//        });
//
//        // Wait for the flag results_finished to turn true
//        waitsFor(function(){
//            return results_finished;
//        }, "The results to be finished", 2000);
//
//        runs(function(){
//            expect(results_successful).toBeNull();
//        })
//
//    });
//})


testSinglePacket();
testMultiplePackets();