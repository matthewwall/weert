[//]: # (This Markdown file was generated from a template)
[//]: # (|         DO NOT EDIT!           |)
[//]: # (Edit the file API.md.tmpl instead)
# The WeeRT RESTful API, Version 1

## Objects

This section lists various objects that the WeeRT API uses, either passed in via the request body, or returned in
the response body. They are all in JSON.

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

|     Attribute | Type   | Description                                                |
|--------------:|--------|------------------------------------------------------------|
|         `_id` | string | A unique identifier. or `streamID`, for the stream.        |
|        `name` | string | A unique name for the stream.                              |
| `description` | string | A free-form description of the stream.                     |
| `unit_group`  | string | The Standard Unit Group used by the stream.                |

#### Example
```JSON
{
  "_id"         : "569aa06605be9995051ee8fe",
  "name"        : "Boiler feed 93",
  "description" : "Onewire feed from boiler; uses blue wire",
  "unit_group"  : "METRIC"
}
```


### The `platform` object

#### Definition

|     Attribute | Type   | Description                                                                                 |
|--------------:|--------|---------------------------------------------------------------------------------------------|
|         `_id` | string | A unique identifier, or `platformID`, for the platform.                                     |
|        `name` | string | A unique name for the platform.                                                             |
| `description` | string | A free-form description of the platform.                                                    |
|    `location` | string | The *streamID* of the Location Stream                                                       |

#### Example

```JSON
{
  "_id"         : "569aa06605be9995051ee8f9",
  "name"        : "Benny's Ute",
  "description" : "Benny's Ute. Yellow Chevy with a black cap",
  "location"    : "569aa06705be9995051ee900"
}
```

### The `packet` object

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

### The `location` packet

This is a specialized version of the `packet` object, which holds location information.

#### Definition

|   Attribute | Type    | Description                                                        |
|------------:|---------|--------------------------------------------------------------------|
| `timestamp` | integer | Unix epoch time in milliseconds.                                   |
|  `latitude` | real    | The latitude in decimal degrees; negative for southern hemisphere. |
| `longitude` | real    | The longitude in decimal degrees; negative for western hemisphere. |
|  `altitude` | real    | The altitude of the platform. [Optional]                           |

#### Example
```JSON
{
  "timestamp" : 1446767591000,
  "latitude"  : 45.1082,
  "longitude" : -122.0395,
  "altitude"  : 235.2
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

## Return codes

The following table gives the pattern of return codes used by WeeRT

| *Status* | *Meaning*                                                                                   |
|:---------|:--------------------------------------------------------------------------------------------|
| 200      | Successfully completed the request.                                                         |
| 201      | Successful creation of a new resource, such as a stream, platform, packet, or location. Generally, the new resource is returned in the response body. |
| 204      | Successful completion of the request, but no content is being returned in the response body.|
| 400      | Bad or malformed request. Possibilities include a bad resource ID, or a duplicate resource ID|
| 404      | Non existent resource. You requested, or tried to delete, a resource that does not exist.   |
| 415      | Invalid content type (perhaps you forgot to set `Content-type` to `application-json`?)      |


## API summary
Unless otherwise noted, data is returned in the response body, formatted as JSON.

| *HTTP verb* | *Endpoint*                                           | *Description*                                                                                     | *STATUS* |
|-------------|------------------------------------------------------|---------------------------------------------------------------------------------------------------|----------|
| `POST`      | `/api/v1/platforms`                                  | Create a new platform, returning its UR in the Locations field. Return its metadata.              | I, D, T |
| `GET`       | `/api/v1/platforms`                                  | Get an array of platform metadata or platform URIs, satisfying sorts and limits.                  | I, D, T |
| `GET`       | `/api/v1/platforms/:platformID`                      | Get the metadata for platform *platformID*.                                                       | I, D, T |
| `PUT`       | `/api/v1/platforms/:platformID`                      | Update the metadata for platform *platformID*.                                                    | I, D, T |
| `DELETE`    | `/api/v1/platforms/:platformID`                      | Delete platform *platformID*.                                                                     | I, D, T |
| `POST`      | `/api/v1/platforms/:platformID/streams`              | Post a new set of streams associated with platform *platformID*                                   |         |
| `GET`       | `/api/v1/platforms/:platformID/streams`              | Get all sets of streams associated with platform *platformID*, satisfying certain search criteria |         |
| `GET`       | `/api/v1/platforms/:platformID/streams/:timestamp`   | Get the set of streams associated with *platformID* at the given time                             |         |
| `DELETE`    | `/api/v1/platforms/:platformID/streams/:timestamp`   | Delete the set of streams associated with *platformID* at the given time                          |         |
| `POST`      | `/api/v1/platforms/:platformID/locations`            | Post a new location for platform *platformID*, returning its URI in the Locations field.          | I, D, T |
| `GET`       | `/api/v1/platforms/:platformID/locations`            | Get all locations for platform *platformID*, satisfying certain search or aggregation criteria.   | I, D, T |
| `GET`       | `/api/v1/platforms/:platformID/locations/latest`     | Return the last location packet for platform *platformID*.                                        | I, D, T |
| `GET`       | `/api/v1/platforms/:platformID/locations/:timestamp` | Return a location packet for platform *platformID* with the given timestamp.                      | I, D, T |
| `DELETE`    | `/api/v1/platforms/:platformID/locations/:timestamp` | Delete a location packet for platform *platformID* with the given timestamp.                      | I, D, T |
| `POST`      | `/api/v1/streams`                                    | Create a new stream, returning its URI in the Locations field. Return its metadata.               | I, D, T |
| `GET`       | `/api/v1/streams`                                    | Return an array of URIs to all the streams.                                                       | I,    T |
| `GET`       | `/api/v1/streams/:streamID`                          | Get the metadata for stream *streamID*.                                                           | I,    T |
| `PUT`       | `/api/v1/streams/:streamID`                          | Set or update the metadata for stream *streamID*                                                  | I,    T |
| `DELETE`    | `/api/v1/streams/:streamID`                          | Delete stream *streamID*                                                                          | I,    T |
| `POST`      | `/api/v1/streams/:streamID/packets`                  | Post a new packet to stream *streamID*, returning its URI in Locations field.                     | I, D, T |
| `GET`       | `/api/v1/streams/:streamID/packets`                  | Get all packets from stream *streamID*, satisfying certain search or aggregation criteria.        | I, D, T |
| `GET`       | `/api/v1/streams/:streamID/packets?agg_type=x&obs_type=y`| Get the aggregate type *x* (*e.g.*, `max`) for observation type *y* from a set of packets.    | I, D, T |
| `GET`       | `/api/v1/streams/:streamID/packets/latest`           | Return the last packet in the stream *streamID*.                                                  | I, D, T |
| `GET`       | `/api/v1/streams/:streamID/packets/:timestamp`       | Return a packet from stream *streamID* with the given timestamp.                                  | I, D, T |
| `DELETE`    | `/api/v1/streams/:streamID/packets/:timestamp`       | Delete a packet from stream *streamID* with the given timestamp.                                  | I, D, T |

Status codes:
I = Implemented
D = Documented
T = Tested
P = Partial

In the examples that follow, the responses are intended to be self-consistent. That is, the same data was used across
all examples.




## Create a new platform

Create a new platform and return its metadata

```
POST /api/v1/platforms
```

**JSON input**

| *Name* | *Type* | *Description* |
|:---|:---|:---|
| `name` | string | Optional. If given, must be unique |

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 201      | Success               |
| 415      | Invalid content type  |

This interface will create the new platform, and create a location stream to hold its location data.

If successful, the server will return the metadata of the new platform.
The URI of the new platform will be returned in the `Location` field.

**Example**

```Shell
$ curl -i --silent -X POST -H Content-type:application/json -d  \
>   '{"name":"Bennys Ute", "description" : "Yellow, with black cap"}'  \
>   http://localhost:3000/api/v1/platforms 
HTTP/1.1 201 CreatedX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0Content-Type: application/json; charset=utf-8Content-Length: 131ETag: W/"83-yLLB8MqlWkDvIfpF1adQTg"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "_id": "56ac1b1bc9cbba9317d70fe0",
    "description": "Yellow, with black cap",
    "location": "56ac1b1bc9cbba9317d70fdf",
    "name": "Bennys Ute"
}

```





## Get platforms

Query the database for information about platforms. Return either an array of URIs to the platforms,
or the platform data itself, depending on the `as` parameter.

```
GET /api/v1/platforms
```

**Parameters**

| *Name*   | *Type* | *Value*      | *Description*                                          |
|:---------|:-------|:-------------|:-------------------------------------------------------|
| `as`     | string | `links`      | Return results as an array of URIs (default).          |
| `as`     | string | `values`     | Return results as an array of platform values.         |


**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |

If successful, the server will return either an array of URIs to all known platforms, or an array of
platform values, depending on the value of parameter `as`.

**Example**

```Shell
$ curl -i --silent -X GET http://localhost:3000/api/v1/platforms 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 133ETag: W/"85-3Qu4oqtfRyL4OPgKyLhy3g"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive[
    "http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0",
    "http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe2"
]

```

*Do the example again, but by value*

```Shell
$ curl -i --silent -X GET http://localhost:3000/api/v1/platforms?as=values 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 259ETag: W/"103-FPkhLB9/GmKakQ97UN3TpQ"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive[
    {
        "_id": "56ac1b1bc9cbba9317d70fe0",
        "description": "Yellow, with black cap",
        "location": "56ac1b1bc9cbba9317d70fdf",
        "name": "Bennys Ute"
    },
    {
        "_id": "56ac1b1bc9cbba9317d70fe2",
        "description": "Blue Yamaha",
        "location": "56ac1b1bc9cbba9317d70fe1",
        "name": "Willies scooter"
    }
]

```





## Get the metadata of a particular platform

```
GET /api/v1/platforms/:platformID
```


| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 404      | Platform not found    |


**Example**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 131ETag: W/"83-3/iVbyvdpPuiEpVaaguWaw"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "_id": "56ac1b1bc9cbba9317d70fe0",
    "description": "Yellow, with black cap",
    "location": "56ac1b1bc9cbba9317d70fdf",
    "name": "Bennys Ute"
}

```





## Update an existing platform

Update the metadata of an existing platform

```
PUT /api/v1/platforms/:platformID
```

**JSON input**

| *Name* | *Type* | *Description* |
|:--|:--|:--|
| `name` | string | Optional. A new name for the platform. If given, it must be unique|

**Return status**

| *Status* | *Meaning*              |
|:---------|:-----------------------|
| 204      | Success                |
| 400      | Malformed request      |
| 404      | Platform not found     |
| 415      | Invalid content type   |

If successful, the server will return status code `204`, with nothing in the response body.

**Example**

```Shell
# The platform before modifications:
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 131ETag: W/"83-3/iVbyvdpPuiEpVaaguWaw"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "_id": "56ac1b1bc9cbba9317d70fe0",
    "description": "Yellow, with black cap",
    "location": "56ac1b1bc9cbba9317d70fdf",
    "name": "Bennys Ute"
}


# Now modify the platform, using PUT:
$ curl -i --silent -X PUT -H Content-type:application/json -d  \
>   '{"description" : "Yellow, with green cap"}'  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0 
HTTP/1.1 204 No ContentX-Powered-By: ExpressETag: W/"a-oQDOV50e1MN2H/N8GYi+8w"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive

# Now retrieve the platform, verifying the update worked:
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 131ETag: W/"83-CiTzSoBcZgIb30gc1EVU8w"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "_id": "56ac1b1bc9cbba9317d70fe0",
    "description": "Yellow, with green cap",
    "location": "56ac1b1bc9cbba9317d70fdf",
    "name": "Bennys Ute"
}

```





## Delete a particular platform

```
DELETE /api/v1/platforms/:platformID
```

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success               |
| 404      | Platform not found    |

**Example of deleting a platform**

```Shell
$ curl -i --silent -X DELETE  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0 
HTTP/1.1 204 No ContentX-Powered-By: ExpressETag: W/"a-oQDOV50e1MN2H/N8GYi+8w"Date: Sat, 30 Jan 2016 02:08:28 GMTConnection: keep-alive
```

**Example of deleting a non-existent platform**

```Shell
$ curl -i --silent -X DELETE  \
>   http://localhost:3000/api/v1/platforms/564532f58719938114311ea3 
HTTP/1.1 404 Not FoundX-Powered-By: ExpressContent-Type: text/plain; charset=utf-8Content-Length: 9ETag: W/"9-nR6tc+Z4+i9RpwqTOwvwFw"Date: Sat, 30 Jan 2016 02:08:28 GMTConnection: keep-aliveNot Found
```





## Post a new location packet

Post a new location for a specific platform

```
POST /api/v1/platforms/:platformID/locations
```

**JSON input**

| *Name* | *Type* | *Description* |
|:--|:--|:--|
| `timestamp` | Integer | Timestamp in milliseconds since the Unix epoch |
| `latitude` | Real | Latitude of the platform |
| `longitude` | Real | Longitude of the platform|
| `altitude`  | Real | Altitude of the platform in meters. Optional.|


**Return status**

| *Status* | *Meaning* |
|:---------|:----------|
| 201      | Success   |
| 415      | Invalid content type |

Post a new location packet for the platform with ID *platformID*. The packet should be contained as a JSON payload in
the body of the POST. The packet must contain keyword `timestamp`, holding the unix epoch time in *milliseconds*
(JavaScript style).

If successful, the server will return a response code of `201`, with the response `location` field set to the URI of the
newly created resource (the new location packet). The response body will contain a copy of the newly created location
packet.

**Example**
```Shell
$ curl -i --silent -X POST -H Content-type:application/json -d  \
>   '{"timestamp" : 1420070450000, "latitude": 45.2, "longitude" : -85.1, "altitude" : 12.9}'  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations 
HTTP/1.1 201 CreatedX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/1420070450000Content-Type: application/json; charset=utf-8Content-Length: 77ETag: W/"4d-GsBGqtXDGgADG2P36K1qvA"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "altitude": 12.9,
    "latitude": 45.2,
    "longitude": -85.1,
    "timestamp": 1420070450000
}

```





## Get locations

Return all location packets from the platform with ID `:platformID` that satisfy a search query.

```
GET /api/v1/platforms/:platformID/locations
```

**Parameters**

| *Name*      | *Type*  | *Description*                                                                                                                      |
|:------------|:--------|:-----------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All timestamps greater than this value will be included in the results. Default: first available packet.                           |
| `stop`      | integer | All timestamps less than or equal to this value will be included in the results. Default: last available packet.                   |
| `limit`     | integer | Limit the number of returned packets to this value. Default: 0 (no limit).                                                         |
| `sort`      | string  | What to sort results by. Default: `timestamp`.                                                                                     |
| `direction` | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                                          |


Returns a status of `400` if the *platformID* does not exist. Additional details are in the response body.

**Example**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 155ETag: W/"9b-x3SgGQdY1u7wQcwJQJiNhg"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive[
    {
        "altitude": 12.9,
        "latitude": 45.2,
        "longitude": -85.1,
        "timestamp": 1420070450000
    },
    {
        "altitude": 12.2,
        "latitude": 45.3,
        "longitude": -85,
        "timestamp": 1420070580000
    }
]

```





## Get last location

Get the last location of a platform

```
GET /api/v1/platforms/:platformID/locations/latest
```
**Return status**

| *Status* | *Meaning*               |
|:---------|:------------------------|
| 200      | Success                 |
| 404      | Packet does not exist, or has an empty location stream  |

If successful, the server will return a response code of `200`, with the URI of the matching timestamp
in the Location field of the response.

**Example**
```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/latest 
HTTP/1.1 200 OKX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/1420070580000Content-Type: application/json; charset=utf-8Content-Length: 75ETag: W/"4b-U9FuQ91xcGjODneR58AK3g"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "altitude": 12.2,
    "latitude": 45.3,
    "longitude": -85,
    "timestamp": 1420070580000
}

```





## Get location at a specific time

Get the location of a platform at a specific time

```
GET /api/v1/platforms/:platformID/locations/:timestamp
```

**Parameters**

| *Name*   | *Type* | *Value*      | *Description*                                          |
|:---------|:-------|:-------------|:-------------------------------------------------------|
| `match`  | string | `exact`      | Require exact match of timestamp.                      |
| `match`  | string | `lastBefore` | Use timestamp or closest previous timestamp (default). |
| `match`  | string | `firstAfter` | Use timestamp or closest later timestamp.              |

If the query `match` is `lastBefore` or `firstAfter`, then an exact match is not necessary.
Instead, the last location before, or after (respectively), the given `timestamp` is returned.

**Return status**

| *Status* | *Meaning*               |
|:---------|:------------------------|
| 200      | Success                 |
| 400      | Platform does not exist |
| 404      | Packet does not exist   |

If successful, the server will return a response code of `200`, with the location encoded as JSON in the response
body.

**Example of exact match**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/1420070450000 
HTTP/1.1 200 OKX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/1420070450000Content-Type: application/json; charset=utf-8Content-Length: 77ETag: W/"4d-GsBGqtXDGgADG2P36K1qvA"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "altitude": 12.9,
    "latitude": 45.2,
    "longitude": -85.1,
    "timestamp": 1420070450000
}

```





## Delete location record

Delete a specific location packet

```
DELETE /api/v1/platforms/:platformID/locations/:timestamp
```

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success               |
| 404      | The platform or location record does not exist |

If successful, the server will return a response code of `204`, with nothing in the response body.
If the platform and/or timestamp do not exist in the database, then a response code of `404` is returned.

**Example**
```Shell
$ curl -i --silent -X DELETE  \
>   http://localhost:3000/api/v1/platforms/56ac1b1bc9cbba9317d70fe0/locations/1420070450000 
HTTP/1.1 204 No ContentX-Powered-By: ExpressETag: W/"a-oQDOV50e1MN2H/N8GYi+8w"Date: Sat, 30 Jan 2016 02:08:28 GMTConnection: keep-alive
```





## Create a new stream

Create a new stream and return its metadata.

```
POST /api/v1/streams
```

**JSON input**

|  **Name** | **Type** | **Description** |
|:----------|:----------|:------------------|
| `name`       | string   | Optional. If given, must be unique. |
| `unit_group` | string | Required. The Standard Unit System used by the stream.|

**Return status**

| *Status* | *Meaning*               |
|:----------|:-------------------------|
| 201      | Success                 |
| 400      | Invalid post (probably a duplicate name) |
| 415      | Invalid content type    |

If a `name` is given, it must be unique.

The streams API makes no requirements of the `unit_group`, but it is generally one of `US`, `METRIC`, or `METRICWX`.

The metadata for the new stream is returned in the response body. A URI for the new stream is returned
in the Location response header.

**Example**
```Shell
$ curl -i --silent -X POST -H Content-type:application/json -d  \
>   '{"name": "weather stream 412", "description": "WX station mounted on Bennys Ute", "unit_group": "METRICWX"}'  \
>   http://localhost:3000/api/v1/streams 
HTTP/1.1 201 CreatedX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3Content-Type: application/json; charset=utf-8Content-Length: 135ETag: W/"87-yapMRt+rlhK4CDPHFf1BvA"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "_id": "56ac1b1bc9cbba9317d70fe3",
    "description": "WX station mounted on Bennys Ute",
    "name": "weather stream 412",
    "unit_group": "METRICWX"
}

```





## Post a new packet

Post a new packet to a specific stream.

```
POST /api/v1/streams/:streamID/packets
```
**JSON input**

| *Name* | *Type* | *Description* |
|:--|:--|:--|
| `timestamp` | Integer | Time since the Unix epoch in milliseconds |
| *observation type* | *any* | The value of the observation type at the timestamp |


**Return status**

| *Status* | *Meaning* |
|:---------|:----------|
| 201      | Success   |
| 415      | Invalid content type |

Post a LOOP packet for the stream with ID *streamID*. The packet must contain keyword `timestamp`, holding the unix
epoch time in *milliseconds* (JavaScript style). Any number of observation types can be included in the packet, but no
more than one of each type. The units used in the packet should be the same specified when the stream was created.

If successful, the server will return a response code of `201`, with the response Location field set to the URL of the
newly created resource (packet), the body holding a JSON representation of the posted packet.


**Example**
```Shell
$ curl -i --silent -X POST -H Content-type:application/json -d  \
>   '{"timestamp": 1454020559000, "outside_temperature": 21.5, "inside_humidity":45}'  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets 
HTTP/1.1 201 CreatedX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020559000Content-Type: application/json; charset=utf-8Content-Length: 75ETag: W/"4b-YtX46HaBxyB7mvCzbtb4/Q"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "inside_humidity": 45,
    "outside_temperature": 21.5,
    "timestamp": 1454020559000
}

```





## Get packets

Return all packets from the stream with ID `:streamID` that satisfy a search query.

```
GET /api/v1/streams/:streamID/packets
```

**Parameters**

| *Name*      | *Type*  | *Description*                                                                                                                      |
|:------------|:--------|:-----------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All packets greater than this value will be included in the results. Default: first available packet.                              |
| `stop`      | integer | All packets less than or equal to this value will be included in the results. Default: last available packet.                      |
| `limit`     | integer | Limit the number of returned packets to this value. Default: 0 (no limit).                                                         |
| `sort`      | string  | What to sort results by. Default: `timestamp`.                                                                                     |
| `direction` | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                                          |

**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |
| 404      | Stream does not exist |

**Example**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 305ETag: W/"131-wsihoG9kjFKU3Lb35X/0+Q"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive[
    {
        "inside_humidity": 45,
        "outside_temperature": 21.5,
        "timestamp": 1454020559000
    },
    {
        "inside_humidity": 44,
        "outside_temperature": 21.6,
        "timestamp": 1454020564000
    },
    {
        "inside_humidity": 43,
        "outside_temperature": 21.7,
        "timestamp": 1454020569000
    },
    {
        "inside_humidity": 42,
        "outside_temperature": 21.8,
        "timestamp": 1454020574000
    }
]

```

**Same example, but sorted by humidity**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets?sort=inside_humidity 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 305ETag: W/"131-h5X/7s16s/nJhq3Bvc51sA"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive[
    {
        "inside_humidity": 42,
        "outside_temperature": 21.8,
        "timestamp": 1454020574000
    },
    {
        "inside_humidity": 43,
        "outside_temperature": 21.7,
        "timestamp": 1454020569000
    },
    {
        "inside_humidity": 44,
        "outside_temperature": 21.6,
        "timestamp": 1454020564000
    },
    {
        "inside_humidity": 45,
        "outside_temperature": 21.5,
        "timestamp": 1454020559000
    }
]

```





## Aggregate packets

Return the aggregate value of an observation type from the stream with ID `:streamID` that satisfies a search and
aggregation query.

```
GET /api/v1/streams/:streamID/packets
```

**Parameters**

| *Name*      | *Type*  | *Description*                                                                                                                      |
|:------------|:--------|:-----------------------------------------------------------------------------------------------------------------------------------|
| `start`     | integer | All packets greater than this value will be included in the results. If missing, then start with the first available packet.       |
| `stop`      | integer | All packets less than or equal to this value will be included in the results. If missing, then end with the last available packet. |
| `aggregate_type` | string | The type of aggregation to be performed. Valid choices include `min`, `max`, `sum`, `avg`, `first` and `last`.                 |
| `obs_type`  | string | The observation type over which the aggregation is to be performed. |

**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |
| 404      | Stream does not exist |

The abbreviation `agg_type` can be used in place of `aggregate_type`.

Null observation values are ignored.

Result is returned in the response body as a single value, encoded in JSON.

If the observation type *obs_type* is not in the collection, then `null` will be returned.

**Example**

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets?agg_type=max&obs_type=outside_temperature 
HTTP/1.1 200 OKX-Powered-By: ExpressContent-Type: application/json; charset=utf-8Content-Length: 4ETag: W/"4-x6VEfan6Omx4EmWA0OBHkQ"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive21.8
```





## Get last packet

Get the last packet emitted by a stream

```
GET /api/v1/streams/:streamID/packets/latest
```
**Return status**

| *Status* | *Meaning*               |
|:---------|:------------------------|
| 200      | Success                 |
| 404      | Stream does not exist or is empty |

If successful, the server will return a response code of `200`, with the URI of the matching timestamp
in the Location field of the response.

**Example**
```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/latest 
HTTP/1.1 200 OKX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020574000Content-Type: application/json; charset=utf-8Content-Length: 75ETag: W/"4b-zeSzE2SsVSqfiCd/sZL+oA"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "inside_humidity": 42,
    "outside_temperature": 21.8,
    "timestamp": 1454020574000
}

```





## Get a specific packet

Get a packet from a specific stream with a specific timestamp

```
GET /api/v1/streams/:streamID/packets/:timestamp
```

**Parameters**

| *Name*   | *Type* | *Value*      | *Description*                                          |
|:---------|:-------|:-------------|:-------------------------------------------------------|
| `match`  | string | `exact`      | Require exact match of timestamp (default).            |
| `match`  | string | `lastBefore` | Use timestamp or closest previous timestamp.           |
| `match`  | string | `firstAfter` | Use timestamp or closest later timestamp.              |

If the query `match` is `lastBefore` or `firstAfter`, then an exact match is not necessary.
Instead, the last location before, or after (respectively), the given `timestamp` is returned.

In all cases, the URI of the matching packet is returned in the `Location` field of the response header.

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 404      | Stream or packet does not exist |

If successful, the server will return a response code of `200`, with the packet encoded as JSON in the response body. If
the stream and/or timestamp do not exist in the database, then a response code of `404` is returned.


**Example of exact match**
```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020559000 
HTTP/1.1 200 OKX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020559000Content-Type: application/json; charset=utf-8Content-Length: 75ETag: W/"4b-YtX46HaBxyB7mvCzbtb4/Q"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "inside_humidity": 45,
    "outside_temperature": 21.5,
    "timestamp": 1454020559000
}

```

**Example of matching `lastBefore`**

Note that the URI of the chosen matching packet is returned in the `Location` field of the response header.

```Shell
$ curl -i --silent -X GET  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020573000?match=lastBefore 
HTTP/1.1 200 OKX-Powered-By: ExpressLocation: http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020569000Content-Type: application/json; charset=utf-8Content-Length: 75ETag: W/"4b-UjFTISvRUCNmsYDCdNrlZQ"Date: Sat, 30 Jan 2016 02:08:27 GMTConnection: keep-alive{
    "inside_humidity": 43,
    "outside_temperature": 21.7,
    "timestamp": 1454020569000
}

```





## Delete a specific packet

Delete a packet from a specific stream with a specific timestamp

```
DELETE /api/v1/streams/:streamID/packets/:timestamp
```

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success               |
| 404      | The stream or packet does not exist |

If successful, the server will return a response code of `204`, with nothing in the response body.
If the stream and/or timestamp do not exist in the database, then a response code of `404` is returned.

**Example**
```Shell
$ curl -i --silent -X DELETE  \
>   http://localhost:3000/api/v1/streams/56ac1b1bc9cbba9317d70fe3/packets/1454020559000 
HTTP/1.1 204 No ContentX-Powered-By: ExpressETag: W/"a-oQDOV50e1MN2H/N8GYi+8w"Date: Sat, 30 Jan 2016 02:08:28 GMTConnection: keep-alive
```





# License & Copyright

Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>

See the file LICENSE for your full rights.

