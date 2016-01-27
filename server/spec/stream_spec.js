/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the creation and fetching of streams
 */

var test_url = require('./test_config').test_root_url + '/streams';
var frisby   = require('frisby');

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
                // We've ßcreated two streams. Fetch them.
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
