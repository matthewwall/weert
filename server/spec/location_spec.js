/*
 * Test spec for testing the creation and fetching of location records
 */
"use strict";

var async        = require('async');
var frisby       = require('frisby');
var normalizeUrl = require('normalize-url');
var request      = require('request');

// How many records to test
var N = 5;

var timestamp = function (i) {
    // Base time is 1-Jan-2015 0000 UTC:
    return 1420070400000 + i * 300000;
};

var latitude = function (i) {
    return 45.0 + i;
};

var longitude = function (i) {
    return -122.0 + i;
};

var indices = [];
var locrecs = [];
var reverse_locrecs = [];
for (var i = 0; i < N; i++) {
    indices[i] = i;
    locrecs[i] = {
        timestamp: timestamp(i),
        latitude : latitude(i),
        longitude: longitude(i)
    };
    reverse_locrecs[N-i-1] = locrecs[i];
}

var testMultipleLocrecs = function () {

    frisby.create('Create a WeeRT platform to hold several location records')
        .post('http://localhost:3000/api/v1/platforms',
            {
                "name": "Test multiple location record platform",
                "description": "Created to test the insertion of multiple location records into a platform"
            },
            {json: true}
        )
        .expectStatus(201)
        .expectHeaderContains('content-type', 'application/json')
        .after(function (error, res, body) {

            // Get the URI for the just created platform resource
            var platform_link        = res.headers.location;
            var platform_locrec_link = normalizeUrl(platform_link + '/locations');
            var time_link = function(timestamp){
                return normalizeUrl(platform_locrec_link + '/' + timestamp);
            };

            // Now launch the POSTs for all the location records.
            // Use raw Jasmine for this.
            describe("Launch and test " + N + " POSTs of location records", function () {
                var results_finished   = false;
                var results_successful = false;

                it("should launch all POSTS", function () {

                    runs(function () {

                        // Use the async library to asynchronously launch the N posts
                        async.each(indices, function (i, callback) {
                            request({
                                url   : platform_locrec_link,
                                method: 'POST',
                                json  : locrecs[i]
                            }, function (error, response, body) {
                                return callback(error);
                            });
                        }, function (err) {
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

                        frisby.create("Retrieve all location records in default order")
                            .get(platform_locrec_link)
                            .expectJSONTypes('', Array)
                            .expectJSON('', locrecs)
                            .toss();

                        frisby.create("Retrieve all location records in reverse order")
                            .get(platform_locrec_link + '?direction=desc')
                            .expectJSONTypes('', Array)
                            .expectJSON('', reverse_locrecs)
                            .toss();

                        frisby.create("Retrieve location records sorted by longitude")
                            .get(platform_locrec_link + '?sort=longitude&direction=asc')
                            .expectJSONTypes('', Array)
                            .expectJSON('', locrecs)
                            .toss();

                        frisby.create("Retrieve location records reverse sorted by longitude")
                            .get(platform_locrec_link + '?sort=longitude&direction=desc')
                            .expectJSONTypes('', Array)
                            .expectJSON('', reverse_locrecs)
                            .toss();

                        frisby.create("Test location records using bad sort direction")
                            .get(platform_locrec_link + '?direction=foo')
                            .expectStatus(400)
                            .toss();

                        frisby.create("Search for default match of a timestamp, which is lastBefore")
                            .get(time_link(locrecs[2].timestamp - 1))
                            .expectStatus(200)
                            .expectJSON('', locrecs[1])
                            .toss();

                        frisby.create("Search for an exact matching timestamp")
                            .get(time_link(locrecs[2].timestamp) + '?match=exact')
                            .expectStatus(200)
                            .expectJSON('', locrecs[2])
                            .toss();

                        frisby.create("Search for an exact match of a non-existing timestamp")
                            .get(time_link(locrecs[2].timestamp - 1) + '?match=exact')
                            .expectStatus(404)
                            .toss();

                        frisby.create("Search for lastBefore a timestamp")
                            .get(time_link(locrecs[2].timestamp - 1) + '?match=lastBefore')
                            .expectStatus(200)
                            .expectJSON('', locrecs[1])
                            .toss();

                        frisby.create("Search for firstAfter a timestamp")
                            .get(time_link(locrecs[2].timestamp + 1) + '?match=firstAfter')
                            .expectStatus(200)
                            .expectJSON('', locrecs[3])
                            .toss();

                        frisby.create("Search for last timestamp in database")
                            .get(time_link(locrecs[2].timestamp) + '?match=latest')
                            .expectStatus(200)
                            .expectJSON('', locrecs[N-1])
                            .toss();

                        frisby.create("Search for a location using a bad match")
                            .get(time_link(locrecs[2].timestamp) + '?match=foo')
                            .expectStatus(400)
                            .toss()
                    });
                });
            });
        })
        .toss();
};


testMultipleLocrecs();