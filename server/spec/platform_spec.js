/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

/*
 * Test spec for testing the creation and fetching of platforms
 */
"use strict";

var test_url = require('./test_config').test_root_url + '/platforms';

var frisby = require('frisby');

// First try to create a platform, but with a missing Content-Type
frisby
    .create('Create a WeeRT platform with a missing Content-Type')
    .post(test_url,
        {"name": "Benny's Ute", "description": "Yellow, with a black cap", "join": "join_keyword1"}
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

// Now try again, but with a Content-Type
frisby
    .create('Create a WeeRT platform #1')
    .post(test_url,
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
        var platform_link1 = res.headers.location;
        frisby
            .create('GET and validate platform #1')
            .get(platform_link1)
            .expectStatus(200)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, name: String, description: String, join: String, streams: Array})
            .expectJSON('', {name: "Benny's Ute", description: "Yellow, with a black cap", join: "join_keyword1"})
            .expectJSON('streams', [])
            .toss();
        frisby
            .create('Create a WeeRT platform #2')
            .post(test_url,
                {"name": "Willie's Ute", "description": "Green, with no cap", "join": "join_keyword2"},
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {_id: String, name: String, description: String, join: String, streams: Array})
            .expectJSON('', {name: "Willie's Ute", description: "Green, with no cap", join: "join_keyword2"})
            .after(function (error, res, body) {
                var platform_link2 = res.headers.location;

                // We have now created two platforms. Fetch the URIs.
                frisby
                    .create('GET and validate all created platform URIs in default sort order')
                    .get(test_url + '?sort=name')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .afterJSON(function (json) {
                        expect(json.indexOf(platform_link1)).not.toBe(-1);
                        expect(json.indexOf(platform_link2)).not.toBe(-1);
                        expect(json.indexOf(platform_link1)).toBeLessThan(json.indexOf(platform_link2))
                    })
                    .toss();

                frisby
                    .create('GET and validate all created platform URIs in reverse sort order')
                    .get(test_url + '?sort=name&direction=desc')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', String)
                    .afterJSON(function (json) {
                        expect(json.indexOf(platform_link1)).not.toBe(-1);
                        expect(json.indexOf(platform_link2)).not.toBe(-1);
                        expect(json.indexOf(platform_link1)).toBeGreaterThan(json.indexOf(platform_link2))
                    })
                    .toss();

                frisby
                    .create('GET all platform URIs using an invalid sort order')
                    .get(test_url + '?sort=name&direction=foo')
                    .expectStatus(400)
                    .toss();

                frisby
                    .create('GET all platform data by value in default sort order')
                    .get(test_url + '?as=values')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
                    .expectJSONTypes('', Array)
                    .expectJSONTypes('*', Object)
                    .afterJSON(function (json) {
                        // Define a function that can find a particular 'name' in the array json
                        var idx_name = function (name) {
                            for (var i = 0; i < json.length; i++) {
                                if (json[i].name === name) return i;
                            }
                            return -1;
                        };
                        expect(idx_name("Benny's Ute")).not.toBe(-1);
                        expect(idx_name("Willie's Ute")).not.toBe(-1);
                        expect(idx_name("Benny's Ute")).toBeLessThan(idx_name("Willie's Ute"));
                    })
                    .toss();

                frisby
                    .create('GET all platform data using a nonsense value for "as"')
                    .get(test_url + '?as=foo')
                    .expectStatus(400)
                    .afterJSON(function (json){
                        expect(json.code).toBe(400);
                        expect(json.message).toBe("Invalid query value for 'as'");
                        expect(json.description).toBe('foo');
                    })
                    .toss();

            })
            .toss();
    })
    .toss();

frisby
    .create("Try to create a platform with an _id field")
    .post(test_url,
        {"name": "Benny's Ute", "description": "Yellow, with a black cap", "join": "join_keyword1", _id: "foo"},
        {json: true}
    )
    .expectStatus(400)
    .toss();

