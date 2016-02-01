/*
 * Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the creation and fetching of streams
 */

"use strict";

var test_url = require('./test_config').test_root_url + '/streams';
var async    = require('async');
var frisby   = require('frisby');
var request  = require('request');


// First try to create a stream, but with a missing Content-Type
frisby.create('A WeeRT stream with a missing Content-Type')
    .post(test_url,
        {
            name       : "A WeeRT stream with a missing Content-Type",
            description: "Created to test streams API",
            join       : "join_keyword1",
            unit_group : "METRIC"
        }
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

frisby
    .create("Try to create a stream with a missing name field")
    .post(test_url,
        {description: "A platform with a missing name field", unit_group: "METRIC"},
        {json: true}
    )
    .expectStatus(201)
    .expectJSONTypes('', {name: undefined, _id: String, description: String, unit_group: String})
    .expectJSON('', {
        description: "A platform with a missing name field",
        unit_group : "METRIC"
    })
    .toss();

frisby
    .create("Try to create a stream with a missing unit_group field")
    .post(test_url,
        {
            "name"       : "Try to create a stream with a missing unit_group field",
            "description": "A platform with a missing unit_group field"
        },
        {json: true}
    )
    .expectStatus(400)
    .toss();


// Now try again, but with a Content-Type and a unit_group
frisby.create('A WeeRT stream #1')
    .post(test_url,
        {
            name       : "A WeeRT stream #1",
            description: "Created to test streams API",
            join       : "join_keyword1",
            unit_group : "METRIC"
        },
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {_id: String, name: String, description: String, join: String})
    .expectJSON('', {
        name       : "A WeeRT stream #1",
        description: "Created to test streams API",
        join       : "join_keyword1",
        unit_group : "METRIC"
    })
    .after(function (error, res, body) {
        // Having created a stream, retrieve it and validate it
        var stream_link1 = res.headers.location;
        frisby.create('GET and validate stream #1')
            .get(stream_link1)
            .expectStatus(200)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSON('', {
                name       : "A WeeRT stream #1",
                description: "Created to test streams API",
                join       : "join_keyword1",
                unit_group : "METRIC"
            })
            .toss();
        frisby.create('A WeeRT stream #2')
            .post(test_url,
                {
                    name       : "A WeeRT stream #2",
                    description: "Created to test streams API",
                    join       : "join_keyword2",
                    unit_group : "METRIC"
                },
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, description: String, join: String, unit_group: String})
            .expectJSON('', {
                name       : "A WeeRT stream #2",
                description: "Created to test streams API",
                join       : "join_keyword2",
                unit_group : "METRIC"
            })
            .after(function (error, res, body) {
                var stream_link2 = res.headers.location;
                // We've created two streams. Fetch them.
                frisby.create('GET and validate all created streams')
                    .get(test_url)
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .afterJSON(function (json) {
                        // Make sure the array of returned links contains the two stream links, and that they
                        // are in the right order
                        describe("Test for array of returned stream URIs", function () {
                            it("contains first stream link", function () {
                                expect(json).toContain(stream_link1)
                            });
                            it("contains second stream link", function () {
                                expect(json).toContain(stream_link2)
                            });
                            it("holds first link before second link", function () {
                                expect(json.indexOf(stream_link1)).toBeLessThan(json.indexOf(stream_link2))
                            });

                        })
                    })
                    .toss();
            })
            .toss()
    })
    .toss();

// Get a non-existent stream:
frisby.create('GET a non-existent stream')
    .get(test_url + "/563e70fb5ebf66aa2e0ea7ee")
    .expectStatus(404)
    .toss();

frisby.create('GET a stream with a malformed streamID')
    .get(test_url + "/foo")
    .expectStatus(400)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSON('', {code: 400, description: "Unable to form ObjectID for streamID of foo"})
    .toss();

frisby.create('Try to create a stream that has an _id field already defined')
    .post(test_url,
        {
            _id          : "foo",
            "name"       : "Try to create a stream that has an _id field already defined",
            "description": "Created to test streams API",
            "join"       : "join_keyword1",
            unit_group   : "METRIC"
        },
        {json: true}
    )
    .expectStatus(400)
    .toss();


/*
 * Tests for PUT
 */
frisby
    .create('Create stream #1 to test update')
    .post(test_url,
        {
            name       : "Updater1",
            description: "Updater1 description",
            unit_group : "METRIC"
        },
        {json: true}
    )
    .expectStatus(201)
    .after(function (error, res, body) {

        // Form the URL for the platform
        var stream_link1 = res.headers.location;

        frisby
            .create('Create stream #2 to test update')
            .post(test_url,
                {
                    name       : "Updater2",
                    description: "Updater2 description",
                    unit_group : "METRIC"
                },
                {json: true}
            )
            .expectStatus(201)
            .after(function (error, res, body) {

                // Get the 2nd stream's URL:
                var stream_link2 = res.headers.location;

                frisby
                    .create('PUT to stream #1')
                    .put(stream_link1,
                        {
                            name       : "Updated1",    // Update name to a new, unique name
                            description: "Updater1 new description A"
                        },
                        {json: true})
                    .expectStatus(204)
                    .after(function (error, res, body) {
                        // Now make sure it was updated
                        frisby.create("Get the freshly updated stream")
                            .get(stream_link1)
                            .expectStatus(200)
                            .expectHeaderContains('content-type', 'application/json')
                            .expectJSON('', {
                                name       : "Updated1",    // name gets updated because it is still unique
                                description: "Updater1 new description A"
                            })
                            .after(function (error, res, body) {
                                // Try time, include a mismatched _id in the metadata
                                frisby.create("PUT to the stream but with a mismatched _id")
                                    .put(stream_link1,
                                        {
                                            _id        : "569a8aafd579b3c37a549690",
                                            description: "Updater1 new description B"
                                        },
                                        {json: true})
                                    .expectStatus(400)
                                    .toss();

                                // Also, try updating the name to a non-unique name
                                frisby.create("PUT to with a non-unique name")
                                    .put(stream_link1,
                                        {
                                            name       : "Updater2",   // Use the name of the 2nd stream
                                            description: "Updater1 new description C"
                                        },
                                        {json: true})
                                    .expectStatus(400)
                                    .toss();
                            })
                            .toss();
                    })
                    .toss();
            })
            .toss();
    })
    .toss();


/*************** Tests for creating and searching for stream metadata *****************/

// How many streams to use for the test
var N = 10;

var indices  = [];
var metadata = [];
for (var i = 0; i < N; i++) {
    indices[i]  = i;
    metadata[i] = {
        name       : "Name of stream " + i,
        description: "Descending description " + (N - i - 1),
        unit_group : "METRIC",
        test_group : "POST_many"
    };
}

var urls         = [];
var reverse_urls = [];

// Launch the POSTs to create all the metadata.
// Use raw Jasmine for this.
describe("Launch and test " + N + " POSTs of metadata", function () {
    var results_finished   = false;
    var results_successful = false;

    it("should launch all POSTS", function () {

        runs(function () {

            // Use the async library to asynchronously launch the N posts
            async.each(indices, function (i, callback) {
                request({
                    url   : test_url,
                    method: 'POST',
                    json  : metadata[i]
                }, function (error, response, body) {
                    // If there is no error, save the location of the created stream
                    if (!error)
                        urls[i] = response.headers.location;
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
        // proceeds to the next run statement. Wait a max of 5 seconds.
        waitsFor(function () {
            return results_finished;
        }, "results to be finished", 5000);

        // All the async POSTs are done. We can test the results.
        runs(function () {
            expect(results_successful).toBeTruthy();

            for (var i = 0; i < N; i++) {
                reverse_urls[i] = urls[N - i - 1];
            }

            // We need to filter out all streams that were created by the other tests
            var qgroup = '&query=' + encodeURIComponent(JSON.stringify({test_group: {$eq: "POST_many"}}));

            frisby.create("Retrieve all stream URIs sorted by name")
                .get(test_url + '?sort=name&direction=asc' + qgroup)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', urls)
                .toss();

            frisby.create("Retrieve all stream URIs sorted by name in reverse order")
                .get(test_url + '?sort=name&direction=desc' + qgroup)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', reverse_urls)
                .toss();

            frisby.create("Retrieve all stream URIs sorted by description")
                .get(test_url + '?sort=description&direction=asc' + qgroup)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', reverse_urls)
                .toss();

            frisby.create("Retrieve all stream URIs reverse sorted by description")
                .get(test_url + '?sort=description&direction=desc' + qgroup)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', urls)
                .toss();

            frisby.create("Test urls using bad sort direction")
                .get(test_url + '?direction=foo')
                .expectStatus(400)
                .toss();

            frisby.create("Retrieve all stream metadata, sorted by name")
                .get(test_url + '?sort=name&direction=asc&as=values' + qgroup)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', metadata)
                .toss();

            // First try the most general query
            var js_query      = JSON.stringify({name: {$eq: "Name of stream 5"}});
            var query_encoded = encodeURIComponent(js_query);
            frisby.create("Test for explicit query")
                .get(test_url + '?query=' + query_encoded)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', [urls[5]])
                .toss();

            // Now try the short cut method:
            var name_encoded = encodeURIComponent("Name of stream 5");
            frisby.create("Test for shortcut query")
                .get(test_url + '?name=' + name_encoded)
                .expectStatus(200)
                .expectJSONTypes('', Array)
                .expectJSON('', [urls[5]])
                .toss();

            frisby.create("Search for a specific stream")
                .get(urls[5])
                .expectStatus(200)
                .expectJSON('', metadata[5])
                .toss();

        });
    });
});