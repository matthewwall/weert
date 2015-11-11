/*
 * Test spec for testing the POSTing of packets to a stream.
 */
var frisby       = require('frisby');
var async        = require('async');
var normalizeUrl = require('normalize-url');
var Client       = require('node-rest-client').Client;

// The number of packets that should be posted.
var N = 1;

// Create an array of indices
var indices = [];
for (var i = 1; i < N+1; i++) indices[i] = i;

// Functions that return the temperature and time at index 'i'
var temperature = function (i){
    return 18.0 + i;
};

var timestamp = function(i){
    // This is 1-Jan-2015 0000 UTC:
    return 1420070400000 + i;
};

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

        // POST a single packet to make sure that's working. Then POST a bunch.
        frisby.create("POST a single packet")
            .post(stream_packet_link,
                {
                    timestamp  : timestamp(0),
                    temperature: temperature(0)
                },
                {json:true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSON('', {timestamp: timestamp(0), temperature: temperature(0)})
            .toss();

        describe("Launch " + N + " POSTs", function () {
            var results_finished = false;
            var results_successful = undefined;
            it("Should launch " + N + " POSTS", function () {

                // Run a function which will asynchronously launch N POSTs
                runs(function () {
                    async.each(indices, function (i, callback) {

                        // For reasons that are not clear to me, I can't get Frisby to work within this 'describe'
                        // block. So, use a simple client code.
                        var client = new Client();

                        // set content-type header and data as json in args parameter
                        var args = {
                            data   : {
                                timestamp  : timestamp(i),
                                temperature: temperature(i)
                            },
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };

                        client.post(stream_packet_link, args, function (data, response) {
                            // If the response code is anything other than 201, then we've failed.
                            if (response.statusCode !== 201)
                                return callback(response.statusCode);


                            // Otherwise, press on by checking to make sure the packet actually got recorded.
                            return callback(null);
                        });

                    }, function (err) {
                        results_finished = true;
                        results_successful = err;
                    });
                });

                // Wait for the flag results_finished to turn true
                waitsFor(function(){
                    return results_finished;
                }, "The results to be finished", 2000);

                runs(function(){
                    expect(results_successful).toBeNull();
                })

            });
        })

    })
    .toss();

