# WeeRT
A real-time interface to weewx using MongoDB, Express, Node, and D3 (MEND?)

## General architecture
- Uses a [Node](https://nodejs.org/) server with the [Express framework](http://expressjs.com/)
- Data is stored in a [MongoDB](https://www.mongodb.org/) server
- The server receives packet updates from weewx via a RESTful interface
- The server then sends the new packets on to clients through a Websocket
connection (using [socket.io](http://socket.io/)).
- When a new client connects to the weert server, it can receive up to 
an hour's worth of loop data.
- After that, the display is updated with every new loop packet
- Real-time plots are done using [D3](http://d3js.org/).

For experimental purposes. Tested on Node V4.2.2, although other versions should work fine.

## To install:

1. Install Node.

2. Download weert into a convenient directory, then cd into it.

3. Install all the required packages using npm:

    ```
    npm install   
    ```

4. Add the following to `weewx.conf`:

    ```
    [StdRestful]
        ...
        [[WeeRT]]
            enable = true

    ...
        
    [Engine]
        [[Services]]
            ...
            restful_services = ..., weert.WeeRT
    ```

5. Make sure the `weert.py` module is in your `PYTHONPATH`.

6. Make sure you are running weewx version 3.3 or later (weert makes use of POST requests, which are
only supported by v3.3+

7. Run `weewxd`

8. Open up a client at [http://localhost:3000](http://localhost:3000).

# RESTful API Version 1

## Objects

This section lists various objects that the WeeRT API uses, either passed in via the request body, or returned in
the response body.

### The `error` object

In case of an error, an `error` object is returned in the body of the response.

#### Definition

|     Attribute | Type    | Description                                                      |
|--------------:|---------|------------------------------------------------------------------|
|        `code` | integer | HTTP status code.                                                |
|     `message` | string  | A string describing the error.                                   |
| `description` | string  | A more detailed description of the error. [Not always available] |

#### Example

```JSON
{
  "code" : 409,
  "message" : "Duplicate time stamp",
  "description" : "E11000 duplicate key error index: weert.streams_s1_packets.$_id_ dup key: { : new Date(1446239529521) }"
}
```

### The `stream` object

#### Definition

|     Attribute | Type   | Description                                                                                |
|--------------:|--------|--------------------------------------------------------------------------------------------|
|         `_id` | string | A unique identifier for the stream.                                                        |
|        `name` | string | A name or nickname for the stream. Need not be unique.                                     |
| `description` | string | A free-form description of the stream.                                                     |
|        `join` | string | A key to an external database, holding additional information about the stream. [Optional] |
|       `model` | string | The hardware model. [Optional]                                                             |

#### Example
```JSON
{
  "_id"         : "309ae56b8d",
  "name"        : "Boiler feed",
  "description" : “Onewire feed from boiler; uses blue wire”,
  "join"        : "87340",
  "model":      : "DS18B20"
}
```


### The `platform` object

#### Definition

|     Attribute | Type   | Description                                                                                 |
|--------------:|--------|---------------------------------------------------------------------------------------------|
|         `_id` | string | A unique identifier for the platform.                                                       |
|        `name` | string | A name or nickname for the platform. Need not be unique.                                    |
| `description` | string | A free-form description of the platform.                                                    |
|     `streams` | array  | An array holding the IDs of any streams located on the platform.                            |
|        `join` | string | A key to an external database, holding additional information about the platform. [Optional] |

#### Example
```JSON
{
  "_id"         : "29e8a6bc",
  "name"        : "Benny's Ute",
  "description" : "Benny's Ute. Yellow Chevy with a black cap",
  "streams"     : ["663f5e", "d65e3a", "2a9b9a"],
  "join"        : "benny_ute"
}
```

### The `location` object

#### Definition

|   Attribute | Type    | Description                                                        |
|------------:|---------|--------------------------------------------------------------------|
| `timestamp` | integer | Unix epoch time in milliseconds.                                   |
|  `latitude` | real    | The latitude in decimal degrees; negative for southern hemisphere. |
| `longitude` | real    | The longitude in decimal degrees; negative for western hemisphere. |
|  `altitude` | real    | The altitude of the platform in meters. [Optional]                 |

#### Example
```JSON
{
  "timestamp" : 1446767591000,
  "latitude"  : 45.1082,
  "longitude" : -122.0395,
  "altitude"  : 235.2
}
```

### The `packets` object

#### Definition

|          Attribute | Type          | Description                                                                                                                 |
|-------------------:|---------------|-----------------------------------------------------------------------------------------------------------------------------|
|        `timestamp` | integer       | Unix epoch time in milliseconds.                                                                                            |
| _observation type_ | _unspecified_ | The type of observation (_e.g._, `outside_temperature`). Generally, these are real values, but WeeRT does not require this. |

#### Example
```JSON
{
 "timestamp" : 1446158201379,
 "outside_temperature" : 22.14,
 "inside_temperature" : 20.51,
 "barometer_pressure": 1004.2
 ...
}
```



## Time queries
Some of the WeeRT APIs involve a *time query*. For example, to get a set of packets from a stream with ID 12345,
one performs an HTTP GET like this:

    GET /api/v1/streams/12345/packets?start=XXXXX&stop=YYYYY

This would return all packets with timestamps between XXXXX and YYYYY. However, this is *exclusive* on the left,
inclusive on the right. So, what is really being returned is packets satisfying the criteria

    XXXXX < timestamp <= YYYYY
    
There are 2 reasons for arranging queries this way.

1. When doing aggregations for adjacent time intervals, it is important that the same packet not be included twice.
If a query included both the start and stop timestamp, then a set of queries of the form

        XXXXX         <= timestamp <= XXXXX +    delta
        XXXXX + delta <= timestamp <= YYYYY +  2*delta

    would include the packet with timestamp `XXXXX + delta` twice.

2. Given that we need to make the query exclusive on either the start or stop, which do we choose?
While a packet with a timestamp `XXXXX` represents the "instantaneous" value of the observation types at time `XXXXX`,
the variables were actually observed for some time period leading up to the timestamp. For example, the packet may
record a rain bucket tip, but that tip was the result of some accumulation of rain leading up to the timestamp.
So, we regard a packet with timestamp `XXXXX` as representing the world leading up to the time `XXXXX`.

    So, it is most natural to have the queries exclusive on the start time, inclusive on the stop time. The query
    of two adjacent time intervals becomes

        XXXXX         <  timestamp <= XXXXX +    delta
        XXXXX + delta <  timestamp <= YYYYY +  2*delta

and the same packet is not included twice.

## General patterns

*Return status*

The following table gives the return code pattern used by WeeRT

| *Status* | *Meaning*                                                                                 |
|----------|-------------------------------------------------------------------------------------------|
| 200      | Successfully completed the request.                                                       |
| 201      | Success creation of a new resource, such as a stream, platform, packet, or location       |
| 400      | Bad request. This may be because the `streamID` or `platformID` doesn't exist.            |
| 404      | Non existent resource. You requested, or tried to delete, a resource that does not exist. |
| 415      | Invalid content type (perhaps you forgot to set `Content-type` to `application-json`?)    |


## API summary
Unless otherwise noted, data is returned in the response body, formatted as JSON.

| *HTTP verb* | *Endpoint*                                     | *Description*                                                                                          | *STATUS* |
|-------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------|----------|
| `POST`      | `/api/v1/platforms`                            | Create a new platform and return its URI.                                                              | I, D, T  |
| `GET`       | `/api/v1/platforms`                            | Get an array of URIs to all platforms.                                                                 |          |
| `GET`       | `/api/v1/platforms/:platformID/metadata`       | Get the metadata for the platform with id *platformID*.                                                |          |
| `PUT`       | `/api/v1/platforms/:platformID/metadata`       | Set or update the metadata for platform with id *platformID*.                                          |          |
| `GET`       | `/api/v1/platforms/:platformID/streams`        | Get an array of URIs to all member streams of the platform with id *platformID*.                       |          |
| `GET`       | `/api/v1/platforms/:platformID/locations`      | Get all locations for the platform with id *platformID*, satisfying certain search criteria.           |          |
| `POST`      | `/api/v1/platforms/:platformID/locations`      | Post a new location for the platform with id *platformID*, returning its URI.                          |          |
| `POST`      | `/api/v1/streams`                              | Create a new stream, returning its URI in the Locations field. Return its metadata.                    | I,    T  |
| `GET`       | `/api/v1/streams`                              | Return an array of URIs to all the streams.                                                            | I     T  |
| `GET`       | `/api/v1/streams/:streamID/`                   | Get the metadata for the stream with id *streamID*.                                                    | I     T  |
| `PUT`       | `/api/v1/streams/:streamID/metadata`           | Set or update the metadata for the stream with id *streamID*                                           |          |
| `POST`      | `/api/v1/streams/:streamID/packets`            | Post a new packet to the stream with id *streamID*, returning its URI in Locations field.              | I, D, T  |
| `GET`       | `/api/v1/streams/:streamID/packets`            | Get all packets from the stream with id *streamID*, satisfying certain search or aggregation criteria. | I, D, T  |
| `GET`       | `/api/v1/streams/:streamID/packets/:timestamp` | Return a packet from *streamID* with the given timestamp.                                              | I, D, T  |
| `DELETE`    | `/api/v1/streams/:streamID/packets/:timestamp` | Delete a packet from *streamID* with the given timestamp.                                              | I, D, T  |

Status codes:
I = Implemented
D = Documented
T = Tested

## Create a new platform

Create a new platform and return its metadata

```
POST /api/v1/platforms
```

*Return status*

| *Status* | *Meaning*             |
|----------|-----------------------|
| 201      | Success               |
| 415      | Invalid content type  |

If successful, the server will return the metadata of the new platform encoded as JSON in the response body.
The URI of the new platform will be returned in the `Location` field.

*Example*

```Shell
$ curl -i -H "Content-type: application/json" -X POST \
> -d '{"name":"Bennys Ute", "description" : "Yellow, with black cap"}' \
> http://localhost:3000/api/v1/platforms
HTTP/1.1 201 Created
X-Powered-By: Express
Location: http://localhost:3000/api/v1/platforms/5643e79193e06e8a3eeb7510
Content-Type: application/json; charset=utf-8
Content-Length: 106
ETag: W/"6a-f4cVJmUPcWC5wohP/IEzBg"
Date: Thu, 12 Nov 2015 01:12:49 GMT
Connection: keep-alive

{
  "name":"Bennys Ute",
  "description":"Yellow, with black cap",
  "streams":[],
  "_id":"5643e79193e06e8a3eeb7510"
}
```

## Post a new packet

Post a new packet to a specific stream.

```
POST /api/v1/streams/:streamID/packets
```

*Return status*

| *Status* | *Meaning* |
|----------|-----------|
| 201      | Success   |
| 415      | Invalid content type |

Post a LOOP packet for the stream with ID *streamID*.
The packet should be contained as a JSON payload in the body of the POST. The packet
must contain keyword `timestamp`, holding the unix epoch time in *milliseconds* (JavaScript style).

If successful, the server will return a response code of `201`, with the response `location` field set to the URL
of the newly created resource (packet), the body holding a JSON representation of the posted packet.

There is no enforcement of the unit system used in the packet,
but best practices is to use the weewx `METRICWX` system.

*Example*
```Shell
$ curl -i -H "Content-Type: application/json" -X POST -d '{"timestamp": 1420070400000,"outside_temperature":"18"}' http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets
HTTP/1.1 201 Created
X-Powered-By: Express
Location: http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets/1420070400000
Content-Type: application/json; charset=utf-8
Content-Length: 54
ETag: W/"36-AZNzWP7/+d3y44m6WZH2SA"
Date: Wed, 11 Nov 2015 23:08:41 GMT
Connection: keep-alive

{
  "timestamp":1420070400000,
  "outside_temperature":"18"
}
```

## List packets

Return all packets from the stream with ID `:streamID` that satisfy a search query.

```
GET /api/v1/streams/:streamID/packets
```

*Parameters*

| *Name*      | *Type*  | *Description*                                                                                                                      |
|-------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All packets greater than this value will be included in the results. Default: first available packet.                              |
| `stop`      | integer | All packets less than or equal to this value will be included in the results. Default: last available packet.                      |
| `limit`     | integer | Limit the number of returned packets to this value. Default: 0 (no limit).                                                         |
| `sort`      | string  | What to sort results by. Default: `timestamp`.                                                                                     |
| `direction` | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                                          |


Returns a status of `400` if the *streamID* does not exist. Additional details are in the response body.

*Example*

```Shell
$ curl -i "http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets?start=1446239520000&stop=1549260201000&limit=3
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 419
ETag: W/"1a3-6mvKcfggWRdHhIiQAJeGng"
Date: Sat, 07 Nov 2015 18:31:32 GMT
Connection: keep-alive
[
  {
    "outside_temperature": 19.9,
    "barometer_pressure": 1002.5,
    "timestamp": 1446239529521
  },
  {
    "outside_temperature": 19.9,
    "barometer_pressure": 1002.5,
    "timestamp": 1446239529522
  },
  {
    "wind_speed": 1.34112,
    "barometer_pressure": 1012.7526,
    "day_rain": 4.064,
    "inside_temperature": 20.222222222222225,
    "wind_direction": 308,
    "outside_temperature": 10.055555555555557,
    "outside_humidity": 93,
    "dewpoint_temperature": 8.97514568039247,
    "timestamp": 1446485068000
  }
]
```

*Example of an invalid request*

```Shell
$ curl -i "http://localhost:3000/api/v1/streams/foo/packets?start=1446239520000&stop=1549260201000&limit=3
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 145
ETag: W/"91-/Jzmfk/vLLpujcFb+ql2oQ"
Date: Sat, 07 Nov 2015 18:36:07 GMT
Connection: keep-alive

{
  "code": 400,
  "message": "Unable to satisfy request for packets",
  "error": "Collection streams_foo_packets does not exist. Currently in strict mode."
}
```


## Aggregate packets

Return the aggregate value of an observation type from the stream with ID `:streamID` that satisfies a search and
aggregation query.

```
GET /api/v1/streams/:streamID/packets
```

*Parameters*

| *Name*      | *Type*  | *Description*                                                                                                                      |
|-------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All packets greater than this value will be included in the results. If missing, then start with the first available packet.       |
| `stop`      | integer | All packets less than or equal to this value will be included in the results. If missing, then end with the last available packet. |
| `aggregate_type` | string | The type of aggregation to be performed. Valid choices include `min`, `max`, `sum`, `avg`, `first` and `last`. Default: `avg`. |
| `obs_type`  | string | The observation type over which the aggregation is to be performed. |

Returns a status of `400` if the *streamID* does not exist. Additional details are in the response body.

Null observation values are ignored.

Result is returned in the response body as a single value, encoded in JSON.

If the observation type *obs_type* is not in the collection, then `null` will be returned.

*Example*
```Shell
$ curl -i "http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets?start=1446239520000&stop=1549260201000&aggregate_type=min&obs_type=outside_temperature"
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 17
ETag: W/"11-mFN9LOMPN/5ME8XyHD9umw"
Date: Sat, 07 Nov 2015 18:48:08 GMT
Connection: keep-alive

9.000000000000002
```


## Get a specific packet

Get a packet from a specific stream with a specific timestamp

```
GET /api/v1/streams/:streamID/packets/:timestamp
```

*Return status*

| *Status* | *Meaning*             |
|----------|-----------------------|
| 200      | Success               |
| 400      | Stream does not exist |
| 404      | Packet does not exist |

If successful, the server will return a response code of `200`, with the packet encoded as JSON in the response
body.

*Example*
```Shell
$ curl -i http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets/1420070400000
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 54
ETag: W/"36-lLv2IFS6swiAlaeajBy9tA"
Date: Wed, 11 Nov 2015 23:12:38 GMT
Connection: keep-alive

{
  "outside_temperature":"18",
  "timestamp":1420070400000
}
```

*Example of requesting a non-existent packet*
```Shell
$ curl -i http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets/1420070400001
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 9
ETag: W/"9-nR6tc+Z4+i9RpwqTOwvwFw"
Date: Thu, 12 Nov 2015 00:10:38 GMT
Connection: keep-alive

Not Found
```



## Delete a specific packet

Delete a packet from a specific stream with a specific timestamp

```
DELETE /api/v1/streams/:streamID/packets/:timestamp
```

*Return status*

| *Status* | *Meaning*             |
|----------|-----------------------|
| 204      | Success               |
| 400      | Stream does not exist |
| 404      | Packet does not exist |

If successful, the server will return a response code of `204`, with nothing in the response body.
If the timestamp does not exist in the database, then a response code of `404` is returned.

*Example*
```Shell
$ curl -i -X DELETE http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets/1420070400000
HTTP/1.1 204 No Content
X-Powered-By: Express
ETag: W/"a-oQDOV50e1MN2H/N8GYi+8w"
Date: Wed, 11 Nov 2015 23:19:38 GMT
Connection: keep-alive
```
