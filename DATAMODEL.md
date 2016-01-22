# WeeRT Data Model

## Definitions

### Timestamp
The time, in milliseconds, since the unix epoch. This is the same definition that JavaScript uses.

### Observation
A discrete, individual datum, such as temperature or pressure. It is known by a name, such as `outside_temperature`.

### Packet
A group of Observations that have a Timestamp, in common. This is commonly data that comes straight off the stream
(raw data). Known as LOOP data in weewx parlance.

### Location Packet
This is a specialized Packet that holds not only a Timestamp, but also decimal latitude and decimal longitude.
Optionally, it may include altitude in meters.

### Stream Name
A unique name, selected by the client.

### Platform Name
A unique name, selected by the client.

### Authentication Token
A bit of JSON that conforms to the JSON Web Token standard.

### Stream
A unique piece of hardware or software that emits a stream of Packets. It is known by a unique Stream Name.
Every Packet emitted by the Stream must include the Platform Name, Stream Name, a valid Authentication Token,
and a unique (to the Stream) Timestamp. The interval between packets may be highly irregular.
Individual Packets need not include all the same Observation types.

### Location Stream
This is a specialized stream that consists exclusively of Location Packets.

### Platform
A group of Streams that have a location in common. A Platform might be a stationary location, such as
an industrial siting, or it might be a mobile location, such as a vehicle or boat.
It is known by a unique Platform Name.
A Platform has one or more streams associated with it, one of which must be a Location Stream.
Its “current location” is defined as the last Location Packet in its Location Stream.
If it is a stationary platform, then the Location Stream will have only one Location Packet in it.

## Configuration

In general, the system is designed to be as self-configuring as possible.
The goal is to avoid having to sit at a provisioning application, entering each and every stream and platform.

The client is responsible for coming up with unique names for the Stream Name and Platform Name.
While the names must be unique, they should also be recognizable.

For Stream Names, one possibility is a combination of the hostname and a UUID.
Something like `humpback-7fb9e1e7-665f-43f9-9816-971e46067fb8`.
The hostname provides something recognizable, the UUID guarantees uniqueness.

For Platform Names, something similar can be done using a combination of the location (or vehicle)
name, and UUID, for example, `ford150-2b083361-4a29-4091-bcf1-3875aa756e0a`.

The client must perform a login process to obtain the authorization token from the WeeRT server.
This token must be included in all mutable requests.

A client may post packets from a new stream without any prior configuration on the server.
If a collection for the given Stream Name does not exist, one will be created.
Of course, later, an operator can go through the set of Streams,
annotating them with details, such as a description.

# Server data models
Data are stored in a MongoDB server.



## Stream data model

### streams_metadata

Metadata associated with WeeRT streams are stored in a MongoDB collection with name `streams_metadata`.
Inside, each document describes a single stream:

| *Field*       | *Type*             | *Explanation*                                                     |
|---------------|--------------------|-------------------------------------------------------------------|
| `_id`         | `mongodb.ObjectID` | Unique *streamID* for the stream, assigned by the server          |
| `name`        | `string`           | Unique name for the stream, assigned by the client                |
| `description` | `string`           | A free form description of the stream                             |
| `unit_group`  | `string`           | Which standard unit group is used by the stream                   |

Example

```Javascript
{
  _id         : mongodb.ObjectID("566cc809afe61ddc22877c39"),
  name        : "Boiler_owfs",
  description : "Onewire feed from boiler",
  unit_group  : "METRICWX"
}
```

### streams_<i>streamID</i>_packets

The raw packet data coming off a stream is stored in a collection with name
<span style="font-family:monospace">streams_<i>streamID</i>_packets</span>, where
<i>streamID</i> is the ID of the stream.

Inside, each document describes a single packet

Description of fields:

| *Field*              | *Type*     | *Description*                                      |
|----------------------|---------------|----------------------------------------------------|
| `_id`                | `Date` | A timestamp in milliseconds since the unix epoch   |
| *`observation type`* | *any*       | The value of the observation type at the timestamp |

There can be any number of different observation types in a packet, but only one entry per type.

Example

```Javascript
{
  _id : new Date(1446158201379),
  outside_temperature: 11.928,
  inside_temperature: 20.12,
  barometer_pressure: 1001.9,
  wind_speed: 3.2,
  wind_direction: 275
  ...
}
```




## Platform data model

###platforms_metadata
Collection `platforms_metadata` holds metadata related information. Each document consists of:


| *Field*       | *Type*             | *Description*                                              |
|---------------|--------------------|------------------------------------------------------------|
| `_id`         | `mongodb.ObjectID` | Unique *platformID* for the stream, assigned by the server |
| `name`        | `string`           | Unique name for the platform, assigned by the client       |
| `description` | `string`           | Freeform description of the Platform                       |
| `location`    | `mongodb.ObjectID` | *streamID* of the associated Location Stream               |

Example:

```Javascript
{
  _id : mongodb.ObjectID("569aa06605be9995051ee8f9"),
  name: "ford150-2b083361-4a29-4091-bcf1-3875aa756e0a",
  description: "Black Ford F-150 truck",
  location: mongodb.ObjectID("569aa06605be9995051ee8fe")
}
```

### platforms_streams

Collection `platforms_streams` holds information about what streams were on the platform
at what time. It is a timestamped set of *streamIDs* for each *platformID*:

| *Field*       | *Type*             | *Description*                              |
|---------------|--------------------|--------------------------------------------|
| `_id`         | `mongodb.ObjectID` | The *platformID* of the platform whose configuration is being described|
| `timestamp`   | `Date`             | Unix epoch time in milliseconds            |
| `streams` | Array of `mongodb.ObjectID` | The set of Streams on the platform at the given time |

Example:

```Javascript
{
  _id : mongodb.ObjectID("569aa06605be9995051ee8f9"),
  timestamp: new Date(1453482991000),
  streams: [mongodb.ObjectID("569aa06605be9995051ee8fe"),
            mongodb.ObjectID("569aa06605be9995051ea105")]
}
```



# Other thoughts.

From an email exchange with Matthew.

This outlines the exchange of information between a weewx instance and a WeeRT server.

In the weewx configuration file:

```ini
[[WeeRT]]
  server_url = SERVER_URL
  user = me
  password = pw
  platform = "Unique Platform Name"
  stream = "Unique Stream Name"
```

Note that in this example, the platform and stream names are hardwired in, but, from weert's perspective,
they don't have to be. They could be autogenerated from the mac address or something else.
The only requirement is that they be unique. We could relax this a bit that the stream name need
only be unique on the platform, but that would make it tough to move an instrument between vehicles.

The startup sequence would look something like this (highly schematic!)

`GET /api/v1/login?user=me&password=pw`

Returns a token, which weewx would probably just save in a Python data structure (not in the config file).

`POST /api/v1/platforms {name: "Unique Platform Name", token: token}`

If the platform does not exist, this will create one and return an HTTP status code of 201 ("Success").
If the platform already exists (which the weert server can determine because the name is unique), it
returns status code of 400 ("Bad request").
Either way, the URL of the platform is returned in the Location header of the response.
Something like `http://localhost/api/v1/platforms/123`.

Similar process with streams:

`POST /api/v1/streams {name: "Unique Stream Name", token: token}`

The URL of the stream is returned in the Location header. Example:
`http://localhost/api/v1/streams/456`

Now you have an URL for both the platform, and for the stream.

Start POSTing new packets:

`POST /api/v1/streams/456/packets {timestamp: 1234567890, outside_temperature=22.5...}`

Location header returns the URL of the packet, which you probably don't need, but that's considered "best practices."

I've been thinking about units, but haven't come to any firm conclusion.
I agree that they should be specified on a stream-by-stream basis, so they belong, somewhere,
in the stream metadata. Your data model for them is as good as anything I can come up with.
The only thing I'd add is that the name of the observation types be structured like `outside_temperature`.
The part after the underscore is the unit group. This has the advantage that you don't
need a table like weewx's `units.obs_group_dict` to map observation type to group name.
This makes it much easier to configure something like an energy monitor where you might have 32 similarly
named channels, each of which would need an entry in the dictionary.
Instead, the observation types could be simply named `v1_volt`, `v2_volt`, `v3_volt`, etc...,
and it's easy to get the unit group out of the name ("`volt`" in this case).

# License & Copyright

Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
