/*
 * Test spec for testing the POSTing of packets to a stream.
 */
var frisby       = require('frisby');
var async        = require('async');
var normalizeUrl = require('normalize-url');
var Client       = require('node-rest-client').Client;

// Create an array of timestamps. Base time is 1-Jan-2015 0000
// Create an array of indices
var indices = [];
for (var i = 0; i < 10; i++) indices[i] = i;

// This is 1-Jan-2015 0000 UTC:
var basetime = 1420070400000;
var basetemp = 18.0;

// Now try again, but with a Content-Type
frisby.create('Create a WeeRT stream to hold packets')
    .post('http://localhost:3000/api/v1/streams',
        {"name": "Test packet stream", "description": "Created to test the insertion of packets into a stream"},
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .after(function (error, res, body) {
        "use strict";
        var stream_link        = res.headers.location;
        var stream_packet_link = normalizeUrl(stream_link + '/packets');

        describe("Launch 10 POSTs", function () {
            var results_finished = false;
            it("Should launch 10 POSTS", function () {

                // Run a function which will asynchronously launch 10 POSTs
                runs(function () {
                    async.each(indices, function (i, callback) {

                        var client = new Client();

                        // set content-type header and data as json in args parameter
                        var args = {
                            data   : {
                                timestamp  : basetime + i * 300000,
                                temperature: basetemp + i
                            },
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };

                        // TODO: Maybe this should use Frisby?
                        client.post(stream_packet_link, args, function (data, response) {
                            return callback(response.statusCode === 201 ? null : response.statusCode);
                        });


                    }, function (err) {
                        if (!err) results_finished = true;
                    });
                });

                // Wait for the flag results_finished to turn true
                waitsFor(function(){
                    return results_finished;
                }, "The results to be finished", 2000);

                runs(function(){
                    // Can check the 10 POSTs here.
                })

            });
        })

    })
    .toss();

