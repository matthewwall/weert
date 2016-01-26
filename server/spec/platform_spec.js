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

var frisby       = require('frisby');
var normalizeUrl = require('normalize-url');

// First try to create a platform, but with a missing Content-Type
frisby
    .create('Create a WeeRT platform with a missing Content-Type')
    .post(test_url,
        {
            name       : "Create a WeeRT platform with a missing Content-Type",
            description: "Yellow, with a black cap",
            join       : "join_keyword1"
        }
    )
    .expectStatus(415)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {code: Number, message: String})
    .expectJSON('', {code: 415, message: "Invalid Content-type"})
    .toss();

// Now try again, but with a Content-Type
frisby
    .create('A WeeRT platform #1')
    .post(test_url,
        {
            name       : "A WeeRT platform #1",
            description: "Yellow, with a black cap",
            join       : "join_keyword1"
        },
        {json: true}
    )
    .expectStatus(201)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('', {
        _id        : String,
        name       : String,
        description: String,
        join       : String,
        location   : String
    })
    .expectJSON('', {
        name       : "A WeeRT platform #1",
        description: "Yellow, with a black cap",
        join       : "join_keyword1"
    })
    .after(function (error, res, body) {
        // Having created a platform, retrieve it and validate it
        // Form the URL for the platform
        var platform_link1 = res.headers.location;
        // And the URL for its location records
        var platform_locrec_link1 = normalizeUrl(platform_link1 + '/locations');
        frisby
            .create('GET and validate the metadata for platform #1')
            .get(platform_link1)
            .expectStatus(200)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {
                _id        : String,
                name       : String,
                description: String,
                join       : String,
                location   : String
            })
            .expectJSON('', {
                name       : "A WeeRT platform #1",
                description: "Yellow, with a black cap",
                join       : "join_keyword1"
            })
            .toss();
        frisby
            .create('Validate the locations collection for platform #1')
            .get(platform_locrec_link1)
            .expectStatus(200)
            .expectJSONTypes('', Array)     // There should not be any locations yet.
            .toss();
        frisby
            .create('Create a WeeRT platform #2')
            .post(test_url,
                {
                    name       : "Create a WeeRT platform #2",
                    description: "Green, with no cap",
                    join       : "join_keyword2"
                },
                {json: true}
            )
            .expectStatus(201)
            .expectHeaderContains('content-type', 'application/json')
            .expectJSONTypes('', {
                _id        : String,
                name       : String,
                description: String,
                join       : String,
                location   : String
            })
            .expectJSON('', {
                name       : "Create a WeeRT platform #2",
                description: "Green, with no cap",
                join       : "join_keyword2"
            })
            .after(function (error, res, body) {
                var platform_link2 = res.headers.location;

                // We have now created two platforms. Fetch the URIs.
                frisby
                    .create('GET and validate all created platform URIs in default sort order')
                    .get(test_url + '?sort=name')
                    .expectStatus(200)
                    .expectHeaderContains('content-type', 'application/json')
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
                    .expectJSONTypes('*', Object)
                    .afterJSON(function (json) {
                        // Define a function that can find a particular 'name' in the array json
                        var idx_name = function (name) {
                            for (var i = 0; i < json.length; i++) {
                                if (json[i].name === name) return i;
                            }
                            return -1;
                        };
                        expect(idx_name("A WeeRT platform #1")).not.toBe(-1);
                        expect(idx_name("Create a WeeRT platform #2")).not.toBe(-1);
                        expect(idx_name("A WeeRT platform #1")).toBeLessThan(idx_name("Create a WeeRT platform #2"));
                    })
                    .toss();

                frisby
                    .create('GET all platform data using a nonsense value for "as"')
                    .get(test_url + '?as=foo')
                    .expectStatus(400)
                    .afterJSON(function (json) {
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
        {
            "name"       : "Benny's Ute",
            "description": "Yellow, with a black cap",
            "join"       : "join_keyword1",
            _id          : "foo"
        },
        {json: true}
    )
    .expectStatus(400)
    .toss();

frisby
    .create("Try to create a platform with a missing name field")
    .post(test_url,
        {"description": "A platform with a missing name field", unit_group: "METRIC"},
        {json: true}
    )
    .expectStatus(201)
    .toss();

frisby
    .create("GET the locations for a non-existent platform")
    .get(test_url + '/5680aaba377084a10b8d6521/locations')
    .expectStatus(404)
    .toss();

// ******************* Tests for deleting a platform ****************************
frisby
    .create('Create a platform with the intention of deleting it')
    .post(test_url,
        {"name": "Deleter1", "description": "Platform that will be deleted", unit_group: "METRIC"},
        {json: true})
    .expectStatus(201)
    .after(function (error, res, body) {
        // Having created a platform, delete it
        // Form the URL for the platform
        var platform_link = res.headers.location;
        // And the URL for its location records
        var platform_locrec_link = normalizeUrl(platform_link + '/locations');
        frisby
            .create('DELETE the platform that was created with the intention of deleting it')
            .delete(platform_link)
            .expectStatus(204)
            .after(function (error, res, body) {
                // Now make sure it is really deleted.
                frisby.create("Try to get the freshly deleted platform")
                    .get(platform_link)
                    .expectStatus(404)
                    .toss();
                // Also make sure its location records no longer exist
                frisby.create("Try to get location records of a deleted platform")
                    .get(platform_locrec_link)
                    .expectStatus(404)
                    .toss();
                // Try deleting a non-existing platform
                frisby.create("Try to DELETE a platform which has already been deleted")
                    .delete(platform_link)
                    .expectStatus(404)
                    .toss();
            })
            .toss();
    })
    .toss();

frisby
    .create("Delete a platform with a malformed ID")
    .delete(test_url + "/569854a26c9badbadbadbad")
    .expectStatus(400)
    .toss();

// ******************* Tests for updating a platform ****************************

// TODO: Need to test for updating to a non-unique name

frisby
    .create('Create platform with the intention of updating it')
    .post(test_url,
        {
            name       : "Updater1",
            description: "Updater1 description"
        },
        {json: true}
    )
    .expectStatus(201)
    .after(function (error, res, body) {
        // Having created a platform, update it
        // Form the URL for the platform
        var platform_link1 = res.headers.location;

        frisby
            .create('Create a 2nd platform to test update')
            .post(test_url,
                {
                    name       : "Updater2",
                    description: "Updater2 description"
                },
                {json: true}
            )
            .expectStatus(201)
            .after(function (error, res, body) {

                frisby
                    .create('PUT to the platform that was created with the intention of updating it')
                    .put(platform_link1,
                        {
                            name       : "Updated1",
                            description: "Updater1 new description A"
                        },
                        {json: true})
                    .expectStatus(204)
                    .after(function (error, res, body) {
                        // Now make sure it was updated
                        frisby.create("Get the freshly updated platform")
                            .get(platform_link1)
                            .expectStatus(200)
                            .expectHeaderContains('content-type', 'application/json')
                            .expectJSONTypes('', {
                                _id        : String,
                                name       : String,
                                description: String,
                                location   : String
                            })
                            .expectJSON('', {
                                name       : "Updated1",    // name gets updated because it is still unique
                                description: "Updater1 new description A"
                            })
                            .after(function (error, res, body) {
                                // Try time, include a mismatched _id in the metadata
                                frisby.create("PUT to the platform that was created with " +
                                        "the intention of updating it, but with a mismatched _id")
                                    .put(platform_link1,
                                        {
                                            _id : "569a8aafd579b3c37a549690",
                                            description: "Updater1 new description B"
                                        },
                                        {json: true})
                                    .expectStatus(400)
                                    .toss();

                                // Also, try updating the name to a non-unique name
                                frisby.create("PUT to the platform that was created with " +
                                        "the intention of updating it, with a non-unique name")
                                    .put(platform_link1,
                                        {
                                            name: "Updater2",
                                            description: "Updater1 new description C"
                                        },
                                        {json: true})
                                    .expectStatus(400)
                                    .toss();
                            })
                            .toss();
                    })
                    .toss();
            }).toss();
    })
    .toss();

frisby
    .create("PUT to a platform with a malformed ID")
    .delete(test_url + "/569854a26c9badbadbadbad")
    .expectStatus(400)
    .toss();

frisby
    .create("PUT to a non-existent platform")
    .delete(test_url + "/569854a26c90000000000000")
    .expectStatus(404)
    .toss();

// TODO: Try to PUT to a non-existent platformID