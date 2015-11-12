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
frisby.create('Create a WeeRT stream #1')
    .post('http://localhost:3000/api/v1/platforms',
        {"name": "Benny's Ute", "description": "Yellow, with a black cap", "join": "join_keyword1"},
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {_id: String, name: String, description: String, join: String})
    .expectJSON('', {name: "Benny's Ute", description: "Yellow, with a black cap", join: "join_keyword1"})
    .toss();
