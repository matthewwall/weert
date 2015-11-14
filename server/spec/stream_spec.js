/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the creation and fetching of streams
 */

var test_url = 'http://localhost:3000/test/v1/streams';
var frisby = require('frisby');

// First try to create a stream, but with a missing Content-Type
frisby.create('Create a WeeRT stream with a missing Content-Type')
    .post(test_url,
        {"name": "Test stream", "description": "Created to test streams API", "join": "join_keyword1"}
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

// Now try again, but with a Content-Type
frisby.create('Create a WeeRT stream #1')
    .post(test_url,
        {"name": "Test stream #1", "description": "Created to test streams API", "join": "join_keyword1"},
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {_id: String, name: String, description: String, join: String})
    .expectJSON('', {name: "Test stream #1", description: "Created to test streams API", join: "join_keyword1"})
    .after(function (error, res, body) {
        // Having created a stream, retrieve it and validate it
        "use strict";
        var stream_link1 = res.headers.location;
        frisby.create('GET and validate stream #1')
            .get(stream_link1)
            .expectStatus(200)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSON('', {name: "Test stream #1", description: "Created to test streams API", join: "join_keyword1"})
            .toss();
        frisby.create('Create a WeeRT stream #2')
            .post(test_url,
                {"name": "Test stream #2", "description": "Created to test streams API", "join": "join_keyword2"},
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, description: String, join: String})
            .expectJSON('', {name: "Test stream #2", description: "Created to test streams API", join: "join_keyword2"})
            .after(function (error, res, body) {
                var stream_link2 = res.headers.location;
                // We have now created two streams. Fetch them.
                frisby.create('GET and validate all created streams')
                    .get(test_url)
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .afterJSON(function(json){
                        // Make sure the array of returned links contains the two stream links, and that they
                        // are in the right order
                        describe("Test for array of returned stream URIs", function(){
                            it("contains first stream link", function(){
                                expect(json).toContain(stream_link1)
                            });
                            it("contains second stream link", function(){
                                expect(json).toContain(stream_link2)
                            });
                            it("holds first link before second link", function(){
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
        {"name": "Test stream #1", "description": "Created to test streams API", "join": "join_keyword1", _id: "foo"},
        {json: true}
    )
    .expectStatus(400)
    .toss();
