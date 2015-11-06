# weert
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

### The `error` object

In case of an error, an `error` object is returned in the body of the response.

#### Definition
|Attribute | Type | Description |
| --------:|:-----|:------------|
| `code`        | integer | HTTP status code.|
| `message`     | string  | A string describing the error.|
| `description` | string  | A more detailed description of the error. [Not always available]|

#### Example

```
{
  "code" : 409,
  "message" : "Duplicate time stamp",
  "description" : "E11000 duplicate key error index: weert.streams_s1_packets.$_id_ dup key: { : new Date(1446239529521) }"
}
```

### The `streams` object

#### Definition

|Attribute | Type | Description |
| --------:|:-----|:------------|
| `_id`      | string | A unique identifier for the stream.|
| `description` | string | A free-form description of the stream.|
| `join`        | string | A key to an external database, holding additional information about the stream. [Optional]|
| `model`       | string | The hardware model. [Optional]|

#### Example
```
{
  "_id"         : "309ae56b8d",
  "description" : “Onewire feed from boiler”,
  "join"        : "87340",
  "model":      : "DS18B20"
}
```

### The `location` object

#### Definition

|Attribute | Type | Description |
| --------:|:-----|:------------|
| `timestamp`      | integer | Unix epoch time in milliseconds.|
| `latitude` | real | The latitude in decimal degrees; negative for southern hemisphere.|
| `longitude` | real | The longitude in decimal degrees; negative for western hemisphere.|

#### Example
```
{
  "timestamp" : 1446767591000,
  "latitude"  : 45.1082,
  "longitude" : -122.0395
}
```

### The `packets` object

#### Definition

|Attribute | Type | Description |
| --------:|:-----|:------------|
| `timestamp`      | integer | Unix epoch time in milliseconds.|
| _observation type_ | _unspecified_ | The type of observation (_e.g._, `outside_temperature`). Generally, these are real values, but WeeRT does not require this.|

#### Example
```
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

1. While a packet with a timestamp XXXXX represents the "instantaneous" value of the observation types at time XXXXX,
the variables were actually observed for some time period leading up to the timestamp. For example, the packet may
record a rain bucket tip, but that tip was the result of some accumulation of rain leading up to the timestamp.
So, we regard a packet with timestamp XXXXX as representing the world leading up to the time XXXXX.

2. When doing aggregations for adjacent time intervals, it is important that the same packet not be included twice.
By making the interval be exclusive on the left, inclusive on the right, we avoid this. So, if one wanted to
create an array of values aggregated over 1 minute, this is a simple matter:

        XXXXX          < timestamp <= YYYYY
        XXXXX +  60000 < timestamp <= YYYYY +  60000
        XXXXX + 120000 < timestamp <= YYYYY + 120000
        etc.
If we did not do this strategy and, instead, the explicit times on both the left and right had to be given,
then the client would have to know the first available timestamp after time XXXXX to perform the 2nd aggregation.
This is impossible without another query.

## API summary

|*HTTP verb* | *Endpoint* | *Description* |
|--------------|----------|-------------|
|`GET` | `/api/v1/streams` | Return an array of URIs to all the streams.|
|`POST`| `/api/v1/streams` | Create a new stream. Return its URI. |
|`GET` | `/api/v1/streams/:streamID/metadata` | Get the metadata for stream with id *streamID* |
|`PUT` | `/api/v1/streams/:streamID/metadata` | Set or update the metadata for the stream with id *streamID* |
|`POST`| `/api/v1/streams/:streamID/packets`  | Post a new packet to the stream with id *streamID*, returning its URI. |
|`GET` | `/api/v1/streams/:streamID/packets`  | Get all packets from the stream with id *streamID*, satisfying certain search or aggregation criteria.|
|`GET` | `/api/v1/streams/:streamID/packets/:timestamp` | Get a packet from the stream with id *stream*D* with the given timestamp |
|`GET` | `/api/v1/platforms` | Get an array of URIs to all platforms.|
|`POST`| `/api/v1/platforms` | Create a new platform and return its URI.|
|`GET` | `/api/v1/platforms/:platformID/metadata` | Get the metadata for the platform with id *platformID*.|
|`PUT` | `/api/v1/platforms/:platformID/metadata` | Set or update the metadata for platform with id *platformID*.|
|`GET` | `/api/v1/platforms/:platformID/streams`   | Get an array of URIs to all member streams of the platform with id *platformID*.|
|`GET` | `/api/v1/platforms/:platformID/locations` | Get all locations for the platform with id *platformID*, satisfying certain search criteria.|
|`POST`| `/api/v1/platforms/:platformID/locations` | Post a new location for the platform with id *platformID*, returning its URI.|

## `/api/v1/streams/:streamID/packets`
### GET

The GET API for the collection of LOOP packets takes two forms.

#### 1. GET packets

    GET
    /api/v1/streams/:streamID/packets?start=XXXXX&stop=YYYYY&limit=N&sort=sortspec
    
    
Get all packets from the LOOP collection for stream with ID *streamID* and with timestamps greater than `XXXXX` 
and less than or equal to `YYYYY`. 
If `XXXXX` is missing, then start with the first available packet. 
If `YYYYY` is missing, then end with the last available packet.

If `limit` is given, then limit the number of returned packets to `N`.

If `sort` is given, then sort the results using *sortspec*.
An example *sortspec* would be `timestamp,asc`, that is, sort the results with ascending timestamps.

Sample URL:

    http://localhost:3000/api/v1/streams/801a8409cd/packets?start=1446158201000&stop=1449260201000&limit=5&sort=timestamp,desc
  
Result is returned in the response body as an array holding the packets satisfying the search criteria, encoded
in JSON.

    [{"wind_speed":4.4704,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":263,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159220000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":252,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159218000},
     {"wind_speed":2.6822,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":276,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159216000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":232,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159214000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":232,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159212000}]

Returns a status of `400` if the *streamID* does not exist. Additional details are in the response body.

#### 2. GET aggregate

    GET
    /api/v1/streams/:streamID/packets?start=XXXXX&stop=YYYYY&aggregate_type=agg&obs_type=obs_name
    
The second form of the GET API applies if the parameter `aggregate_type` appears, 
in which case an *aggregate* is returned. For this form,
get the aggregate `agg` of observation type *obs_name* from stream *streamID* between 
timestamps `XXXXX` and `YYYYY` inclusive.
If `XXXXX` is missing, then start with the first available packet. 
If `YYYYY` is missing, then end with the last available packet.

Choices for the aggregation type `agg` include `min`, `max`, `sum`, `avg`, `first` and `last`. 
If the aggregation type `agg` is missing, then use `avg`.

Null observation values are ignored.

If the observation type *obs_name* is not in the collection, then `null` will be returned.

Example request:

    http://localhost:3000/api/v1/streams/801a8409cd/packets?start=1446158201000&stop=1449260201000&aggregate_type=min&obs_type=outside_temperature
    
Result is returned in the response body as a single value, encoded in JSON.

Returns a status of `400` if the *streamID* does not exist. Additional details are in the HTTP response body.


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