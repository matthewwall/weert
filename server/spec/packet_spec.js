/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the POSTing of packets to a stream.
 */
"use strict";

var test_url = require('./test_config').test_root_url + '/streams';


var async        = require('async');
var frisby       = require('frisby');
var normalizeUrl = require('normalize-url');
var request      = require('request');

var timestamp = function (i) {
    // Base time is 1-Jan-2015 0000 UTC:
    return 1420070400000 + i * 300000;
};

var temperature = function (i) {
    return 40 - i;
};

var testSinglePacket = function () {
    frisby
        .create('Create a WeeRT stream to hold a single packet')
        .post(test_url,
            {
                name       : "Test packet stream 1",
                description: "Created to test the insertion of a single packet into a stream",
                unit_group : "METRIC"
            },
            {json: true}
        )
        .expectStatus(201)
        .expectHeaderContains('content-type', 'application/json')
        .after(function (error, res) {
            // Successfully created a stream. Now let's try posting into it. First, get the link to the new stream.
            var stream_link = res.headers.location;
            // This is where to POST new packets:
            var stream_packet_link = normalizeUrl(stream_link + '/packets');

            // POST a single packet
            frisby
                .create("POST a single packet")
                .post(stream_packet_link,
                    {
                        timestamp          : timestamp(0),
                        outside_temperature: temperature(0)
                    },
                    {json: true}
                )
                .expectStatus(201)
                .expectHeaderContains('content-type', 'application/json')
                .expectJSON('',
                    {
                        timestamp          : timestamp(0),
                        outside_temperature: temperature(0)
                    })
                .after(function () {
                    // We've POSTed a packet. Now try to retrieve it:
                    var packet_link = normalizeUrl(stream_packet_link + '/' + timestamp(0));
                    frisby.create("GET a single packet")
                        .get(packet_link)
                        .expectStatus(200)
                        .expectHeaderContains('content-type', 'application/json')
                        .expectJSON('',
                            {
                                timestamp          : timestamp(0),
                                outside_temperature: temperature(0)
                            })
                        .after(function () {
                            // We've retrieved it. Now delete it.
                            frisby.create("DELETE a single packet")
                                .delete(packet_link)
                                .expectStatus(204)
                                .after(function () {
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

            frisby
                .create("Post a packet with no timestamp")
                .post(stream_packet_link,
                    {
                        outside_temperature: temperature(0)
                    },
                    {json: true}
                )
                .expectStatus(400)
                .toss();

            frisby
                .create("Post a packet with an _id field")
                .post(stream_packet_link,
                    {
                        timestamp          : timestamp(0),
                        outside_temperature: temperature(0),
                        _id                : "foo"
                    },
                    {json: true}
                )
                .expectStatus(400)
                .toss();

            // Test for error when posting duplicate timestamps
            frisby
                .create("Post first packet to test for posting a duplicate timestamp")
                .post(stream_packet_link,
                    {
                        timestamp          : 1454171255560,
                        outside_temperature: 20
                    },
                    {json: true}
                )
                .expectStatus(201)
                .after(function () {
                    frisby
                        .create("Post 2nd packet to test for posting a duplicate timestamp")
                        .post(stream_packet_link,
                            {
                                timestamp          : 1454171255560,
                                outside_temperature: 20
                            },
                            {json: true}
                        )
                        .expectStatus(409)
                        .toss();
                })
                .toss();
        })
        .toss();
};

var testMiscellaneous = function () {

    frisby
        .create("Get a single packet from a non-existent stream")
        .get(test_url + "/56a9962066c7ea36598cd4c3/packets/latest")
        .expectStatus(404)
        .toss();

    frisby
        .create("Retrieve all packets from a non-existent stream")
        .get(test_url + "/56a9962066c7ea36598cd4c3/packets")
        .expectStatus(404)
        .toss();

    frisby
        .create("POST to a non-existent stream")
        .post(test_url + "/56accd7718b4e21640adf305/packets",
            {
                timestamp          : timestamp(0),
                outside_temperature: temperature(0)
            },
            {json: true}
        )
        .expectStatus(404)
        .toss();
};


var testMultiplePackets = function () {
    // How many packets to use for the test.
    // Must be > 5 for the tests to work.
    var N = 20;
    var query;

    var indices         = [];
    var packets         = [];
    var reverse_packets = [];
    for (var i = 0; i < N; i++) {
        indices[i]                 = i;
        packets[i]                 = {
            timestamp          : timestamp(i),
            outside_temperature: temperature(i)
        };
        reverse_packets[N - i - 1] = packets[i];
    }


    frisby.create('Create a WeeRT stream to test packet retrieval')
        .post(test_url,
            {
                name       : "Test packet retrieval",
                description: "Stream created to test the retrieval of multiple packets",
                unit_group : "METRIC"
            },
            {json: true}
        )
        .expectStatus(201)
        .expectHeaderContains('content-type', 'application/json')
        .after(function (error, res) {

            // Get the URI for the just created stream resource
            var stream_link = res.headers.location;
            // Use it to form the URI for the packets resource
            var stream_packet_link = normalizeUrl(stream_link + '/packets');
            // This function will return the URI for the specific packet at a given timestamp
            var time_link = function (timestamp) {
                return normalizeUrl(stream_packet_link + '/' + timestamp);
            };

            // Now launch the POSTs to create all the packets
            // Use raw Jasmine for this.
            describe("Launch and test " + N + " POSTs of packets", function () {
                var results_finished   = false;
                var results_successful = false;

                it("should launch all POSTS", function () {

                    runs(function () {

                        // Use the async library to asynchronously launch the N posts
                        async.each(indices, function (i, callback) {
                            request({
                                url   : stream_packet_link,
                                method: 'POST',
                                json  : packets[i]
                            }, function (error) {
                                return callback(error);
                            });
                        }, function (err) {
                            // This function is called when finished. Signal that we're finished, and whether
                            // there were any errors
                            results_finished   = true;
                            results_successful = !err;
                        });

                    });

                    // This function will spin until its callback return true. Then the thread of control
                    // proceeds to the next run statement
                    waitsFor(function () {
                        return results_finished;
                    }, "results to be finished", 2000);

                    // All the async POSTs are done. We can test the results.
                    runs(function () {
                        expect(results_successful).toBeTruthy();

                        frisby.create("Retrieve all packets in default order")
                            .get(stream_packet_link)
                            .expectStatus(200)
                            .expectJSONTypes('', Array)
                            .expectJSON('', packets)
                            .toss();

                        frisby.create("Retrieve all packets in reverse order")
                            .get(stream_packet_link + '?direction=desc')
                            .expectStatus(200)
                            .expectJSONTypes('', Array)
                            .expectJSON('', reverse_packets)
                            .toss();

                        frisby.create("Retrieve packets sorted by temperature")
                            .get(stream_packet_link + '?sort=outside_temperature&direction=asc')
                            .expectStatus(200)
                            .expectJSONTypes('', Array)
                            .expectJSON('', reverse_packets)
                            .toss();

                        frisby.create("Retrieve packets reverse sorted by temperature")
                            .get(stream_packet_link + '?sort=outside_temperature&direction=desc')
                            .expectStatus(200)
                            .expectJSONTypes('', Array)
                            .expectJSON('', packets)
                            .toss();

                        frisby.create("Test packets using bad sort direction")
                            .get(stream_packet_link + '?direction=foo')
                            .expectStatus(400)
                            .toss();

                        frisby.create("Get aggregate_type max")
                            .get(stream_packet_link + '?aggregate_type=max&obs_type=outside_temperature')
                            .expectStatus(200)
                            .afterJSON(function (json) {
                                expect(json).toEqual(temperature(0));
                            })
                            .toss();

                        frisby.create("Get agg_type min value")
                            .get(stream_packet_link + '?agg_type=min&obs_type=outside_temperature')
                            .expectStatus(200)
                            .afterJSON(function (json) {
                                expect(json).toEqual(temperature(N - 1));
                            })
                            .toss();

                        frisby.create("Get min value of a bogus observation type")
                            .get(stream_packet_link + '?agg_type=min&obs_type=bogus_temperature')
                            .expectStatus(200)
                            .afterJSON(function (json) {
                                expect(json).toEqual(null);
                            })
                            .toss();

                        // Test a query. Select only packets where temperature <= the temperature in record 5. Because
                        // temperatures descend with time, this will exclude the first 5 records.
                        // So, there should be N-5 left.
                        query = '&query=' + encodeURIComponent(JSON.stringify({outside_temperature: {$lte: temperature(5)}}));
                        frisby.create("Get packets by value with query")
                            .get(stream_packet_link + '?as=values&' + query)
                            .expectStatus(200)
                            .afterJSON(function (json) {
                                expect(json).toEqual(packets.slice(5));     // Exclude first 5 records
                            })
                            .toss();

                        // Test adding an arbitrary query to the aggregation. In this case, look for the min
                        // temperature in the records restricted to those with temperature >= the temperature
                        // in the N-3 record. Because temperatures are descending with time, this should be
                        // the temperature of the N-3 record
                        query = '&query=' + encodeURIComponent(JSON.stringify({outside_temperature: {$gte: temperature(N-3)}}));
                        frisby.create("Get aggregate with query")
                            .get(stream_packet_link + '?agg_type=min&obs_type=outside_temperature' + query)
                            .expectStatus(200)
                            .afterJSON(function (json) {
                                expect(json).toEqual(temperature(N - 3));
                            })
                            .toss();

                        frisby.create("Search for last packet")
                            .get(time_link('latest'))
                            .expectStatus(200)
                            .expectJSON('', packets[N - 1])
                            .after(function (error, res) {
                                describe("Test that search for last packet", function () {
                                    it("contains the packet link", function () {
                                        expect(res.headers.location).toEqual(time_link(timestamp(N - 1)))
                                    });
                                })
                            })
                            .toss();

                        frisby.create("Search for default match of a timestamp, which is exact")
                            .get(time_link(packets[2].timestamp))
                            .expectStatus(200)
                            .expectJSON('', packets[2])
                            .toss();

                        frisby.create("Search for an explicit exact match")
                            .get(time_link(packets[2].timestamp) + '?match=exact')
                            .expectStatus(200)
                            .expectJSON('', packets[2])
                            .toss();

                        frisby.create("Search for an exact match of a non-existing timestamp")
                            .get(time_link(packets[2].timestamp - 1) + '?match=exact')
                            .expectStatus(404)
                            .toss();

                        frisby.create("Search for lastBefore a timestamp")
                            .get(time_link(packets[2].timestamp - 1) + '?match=lastBefore')
                            .expectStatus(200)
                            .expectJSON('', packets[1])
                            .after(function (error, res) {
                                describe("Test that search for lastBefore packet", function () {
                                    it("contains the packet link", function () {
                                        expect(res.headers.location).toEqual(time_link(timestamp(1)))
                                    });
                                })
                            })
                            .toss();

                        frisby.create("Search for firstAfter a timestamp")
                            .get(time_link(packets[2].timestamp + 1) + '?match=firstAfter')
                            .expectStatus(200)
                            .expectJSON('', packets[3])
                            .toss();

                        frisby.create("Search for a location using a bad match")
                            .get(time_link(packets[2].timestamp) + '?match=foo')
                            .expectStatus(400)
                            .toss()
                    });
                });
            });
        })
        .toss();
};

testSinglePacket();
testMiscellaneous();
testMultiplePackets();
