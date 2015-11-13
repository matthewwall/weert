/*
 * Test spec for testing the creation and fetching of location records
 */
"use strict";

var frisby = require('frisby');
var normalizeUrl = require('normalize-url');

var timestamp = function (i) {
    // Base time is 1-Jan-2015 0000 UTC:
    return 1420070400000 + i * 300000;
};

var latitude = function (i) {
    return 45.0 + i;
};

var longitude = function(i){
    return -122.0 + i;
};

var testMultipleLocrecs = function () {
    var locrecs = [];
    for (var i = 0; i < 3; i++) {
        locrecs[i] = {
            timestamp  : timestamp(i),
            latitude : latitude(i),
            longitude : longitude(i)
        }
    }
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
            // POST three location records into it
            frisby.create("POST location record #0")
                .post(platform_locrec_link,
                    locrecs[0],
                    {json: true}
                )
                .after(function (error, res, body) {
                    frisby.create("POST location record #1")
                        .post(platform_locrec_link,
                            locrecs[1],
                            {json: true}
                        )
                        .after(function (error, res, body) {
                            frisby.create("POST location record #2")
                                .post(platform_locrec_link,
                                    locrecs[2],
                                    {json: true}
                                )
                                .after(function (error, res, body) {
                                    frisby.create("Retrieve all location records in default order")
                                        .get(platform_locrec_link)
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', locrecs)
                                        .toss();

                                    frisby.create("Retrieve all location records in reverse order")
                                        .get(platform_locrec_link + '?direction=desc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', [locrecs[2], locrecs[1], locrecs[0]])
                                        .toss();

                                    frisby.create("Retrieve location records sorted by longitude")
                                        .get(platform_locrec_link + '?sort=longitude&direction=asc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', locrecs)
                                        .toss();

                                    frisby.create("Retrieve location records reverse sorted by longitude")
                                        .get(platform_locrec_link + '?sort=longitude&direction=desc')
                                        .expectJSONTypes('', Array)
                                        .expectJSON('', [locrecs[2], locrecs[1], locrecs[0]])
                                        .toss();

                                    frisby.create("Test location records using bad sort direction")
                                        .get(platform_locrec_link + '?direction=foo')
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
};


testMultipleLocrecs();