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

For experimental purposes.

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

## API summary
Unless otherwise noted, data is returned in the response body formatted as JSON.

| *HTTP verb* | *Endpoint*                                     | *Description*                                                                                          | *STATUS* |
|-------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------|----------|
| `GET`       | `/api/v1/streams`                              | Return an array of URIs to all the streams.                                                            | Done.    |
| `POST`      | `/api/v1/streams`                              | Create a new stream, returning its URI in the Locations field. Return its metadata.                    | Done.    |
| `GET`       | `/api/v1/streams/:streamID/metadata`           | Return the metadata for stream with id *streamID*.                                                     | Done.    |
| `PUT`       | `/api/v1/streams/:streamID/metadata`           | Set or update the metadata for the stream with id *streamID*                                           |          |
| `POST`      | `/api/v1/streams/:streamID/packets`            | Post a new packet to the stream with id *streamID*, returning its URI in Locations field.              | Done.    |
| `GET`       | `/api/v1/streams/:streamID/packets`            | Get all packets from the stream with id *streamID*, satisfying certain search or aggregation criteria. | Done.    |
| `GET`       | `/api/v1/streams/:streamID/packets/:timestamp` | Return a packet from *streamID* with the given timestamp.                                              | Done.    |
| `GET`       | `/api/v1/platforms`                            | Get an array of URIs to all platforms.                                                                 |          |
| `POST`      | `/api/v1/platforms`                            | Create a new platform and return its URI.                                                              |          |
| `GET`       | `/api/v1/platforms/:platformID/metadata`       | Get the metadata for the platform with id *platformID*.                                                |          |
| `PUT`       | `/api/v1/platforms/:platformID/metadata`       | Set or update the metadata for platform with id *platformID*.                                          |          |
| `GET`       | `/api/v1/platforms/:platformID/streams`        | Get an array of URIs to all member streams of the platform with id *platformID*.                       |          |
| `GET`       | `/api/v1/platforms/:platformID/locations`      | Get all locations for the platform with id *platformID*, satisfying certain search criteria.           |          |
| `POST`      | `/api/v1/platforms/:platformID/locations`      | Post a new location for the platform with id *platformID*, returning its URI.                          |          |

## List packets

Return all packets from the stream with ID `:streamID` that satisfy a search query.

```
GET /api/v1/streams/:streamID/packets
```

*Parameters*

| *Name*      | *Type*  | *Description*                                                                                                                      |
|-------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All packets greater than this value will be included in the results. If missing, then start with the first available packet.       |
| `stop`      | integer | All packets less than or equal to this value will be included in the results. If missing, then end with the last available packet. |
| `limit`     | integer | Limit the number of returned packets to this value. Default: 0 (no limit).                                                         |
| `sort`      | string  | What to sort results by. Default: `timestamp`.                                                                                     |
| `direction` | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                                          |


Returns a status of `400` if the *streamID* does not exist. Additional details are in the response body.

*Example*

```Shell
curl -i "http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets?start=1446239520000&stop=1549260201000&limit=3
```

*Results*
```
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
curl -i "http://localhost:3000/api/v1/streams/foo/packets?start=1446239520000&stop=1549260201000&limit=3
```

*Results*
```
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
curl -i "http://localhost:3000/api/v1/streams/563e2677c1b794520641abaf/packets?start=1446239520000&stop=1549260201000&aggregate_type=min&obs_type=outside_temperature"
```

*Results*
```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 17
ETag: W/"11-mFN9LOMPN/5ME8XyHD9umw"
Date: Sat, 07 Nov 2015 18:48:08 GMT
Connection: keep-alive

9.000000000000002
```


### POST

    POST
    /api/v1/streams/:streamID/packets

Post a LOOP packet for the stream with ID *streamID*. 
The packet should be contained as a JSON payload in the body of the POST. The packet
must contain keyword `timestamp`, holding the unix epoch time in *milliseconds* (JavaScript style).

There is no enforcement of the unit system used in the packet, 
but best practices is to use the weewx `METRICWX` system.

Sample URL:

    http://localhost:3000/api/v1/streams/801a8409cd/packets

Example packet:

```
{"wind_speed":4.4704,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,
 "wind_direction":263,"outside_temperature":14.72,"outside_humidity":80,
 "dewpoint_temperature":11.30,"timestamp":1446159220000}
```

If successful, the server will return a response code of `202`, with the response `location` field set to the URL
of the newly created resource (packet).

## `/api/v1/streams/:streamID/packets/:timestamp`
### GET

    GET
    /api/v1/streams/:streamID/packets/:timestamp

Get a single packet from the collection of LOOP packets of stream *streamID* with timestamp *timestamp*.

Sample URL:

    http://localhost:3000/api/v1/streams/801a8409cd/packets/1446159220000
    
Result is returned in the response body as a single packet, encoded in JSON:

    {"wind_speed":4.4704,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,
     "wind_direction":263,"outside_temperature":14.72,"outside_humidity":80,
     "dewpoint_temperature":11.30,"timestamp":1446159220000}

Returns a null value if the timestamp does not exist within the LOOP collection.

Returns a status of `400` if the *streamID* does not exist. Additional details are in the HTTP response body.