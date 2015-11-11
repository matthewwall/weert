/*
 * Test spec for testing the creation and fetching of streams
 */
var frisby = require('frisby');

// First try to create a stream, but with a missing Content-Type
frisby.create('Create a WeeRT stream with a missing Content-Type')
    .post('http://localhost:3000/api/v1/streams',
        {"name": "Test stream", "description": "Created to test streams API", "join": "join_keyword"}
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

// Now try again, but with a Content-Type
frisby.create('Create a WeeRT stream #1')
    .post('http://localhost:3000/api/v1/streams',
        {"name": "Test stream #1", "description": "Created to test streams API", "join": "join_keyword1"},
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {_id: String, description: String, join: String})
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
            .post('http://localhost:3000/api/v1/streams',
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
                    .get('http://localhost:3000/api/v1/streams')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .expectJSON([stream_link1, stream_link2])
                    .toss();
            })
            .toss()
    })
    .toss();

// Get a non-existent stream:
frisby.create('GET a non-existent stream')
    .get("http://localhost:3000/api/v1/streams/563e70fb5ebf66aa2e0ea7ee")
    .expectStatus(200)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSON('', null)
    .toss();

frisby.create('GET a stream with a malformed streamID')
    .get("http://localhost:3000/api/v1/streams/foo")
    .expectStatus(400)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSON('', {code: 400, message: "Unable to satisfy request for stream with _id foo"})
    .toss();

