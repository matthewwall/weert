/*
 * Test spec for testing the POSTing of packets to a stream.
 */
var frisby       = require('frisby');
var async        = require('async');
var normalizeUrl = require('normalize-url');
// var Client       = require('node-rest-client').Client;

// The number of packets that should be posted.
var N = 1;

// This is 1-Jan-2015 0000 UTC:
var timestamp   = 1420070400000;
var temperature = 18.0;

frisby.create('Create a WeeRT stream to hold packets')
    .post('http://localhost:3000/api/v1/streams',
        {"name": "Test packet stream", "description": "Created to test the insertion of packets into a stream"},
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

        // Now POST a single packet
        frisby.create("POST a single packet")
            .post(stream_packet_link,
                {
                    timestamp: timestamp,
                    temperature: temperature
                },
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSON('',
                {
                    timestamp: timestamp,
                    temperature: temperature
                })
            .after(function (error, res, body) {
                // We've POSTed a packet. Now try to retrieve it:
                var packet_link = normalizeUrl(stream_packet_link + '/' + timestamp);
                frisby.create("GET a single packet")
                    .get(packet_link)
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSON('',
                        {
                            timestamp: timestamp,
                            temperature: temperature
                        })
                    .toss();
            })
            .toss();

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

    })
    .toss();

