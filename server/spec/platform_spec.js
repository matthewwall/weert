/*
 * Test spec for testing the creation and fetching of platforms
 */
var frisby = require('frisby');

// First try to create a platform, but with a missing Content-Type
frisby.create('Create a WeeRT platform with a missing Content-Type')
    .post('http://localhost:3000/api/v1/platforms',
        {"name": "Benny's Ute", "description": "Yellow, with a black cap", "join": "join_keyword1"}
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

// Now try again, but with a Content-Type
frisby.create('Create a WeeRT platform #1')
    .post('http://localhost:3000/api/v1/platforms',
        {"name": "Benny's Ute", "description": "Yellow, with a black cap", "join": "join_keyword1"},
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {_id: String, name: String, description: String, join: String, streams: Array})
    .expectJSON('', {name: "Benny's Ute", description: "Yellow, with a black cap", join: "join_keyword1"})
    .expectJSON('streams', [])
    .after(function (error, res, body) {
        // Having created a platform, retrieve it and validate it
        "use strict";
        var platform_link1 = res.headers.location;
        frisby.create('GET and validate platform #1')
            .get(platform_link1)
            .expectStatus(200)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, name: String, description: String, join: String, streams: Array})
            .expectJSON('', {name: "Benny's Ute", description: "Yellow, with a black cap", join: "join_keyword1"})
            .expectJSON('streams', [])
            .toss();
        frisby.create('Create a WeeRT platform #2')
            .post('http://localhost:3000/api/v1/platforms',
                {"name": "Willie's Ute", "description": "Green, with no cap", "join": "join_keyword2"},
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, name: String, description: String, join: String, streams: Array})
            .expectJSON('', {name: "Willie's Ute", description: "Green, with no cap", join: "join_keyword2"})
            .after(function (error, res, body) {
                var platform_link2 = res.headers.location;
                // We have now created two platforms. Fetch them.
                frisby.create('GET and validate all created platforms')
                    .get('http://localhost:3000/api/v1/platforms')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .expectJSON([platform_link1, platform_link2])
                    .toss();
            })
            .toss();
    })    .toss();
