# WeeRT Data Model

## Definitions

### Timestamp
The time, in milliseconds, since the unix epoch. This is the same definition that JavaScript uses.

### Observation
A discrete, individual datum, such as temperature or pressure. It is known by a name, such as `outside_temperature`.
The part after the underscore `temperature` is the Unit Group.

### Unit Group
A collection of similar observation types, which share a unit in common. For example, the group `temperature` would be
shared between `inside_temperature`, `outside_temperature`, `dewpoint_temperature`. All would use the same unit.
(Perhaps, `degree_C`.)

### Standard Unit System
This is a system of units, identified by a unique name, such as `METRICWX`. Within a Standard Unit System,
the type of unit used by each Unit Group is specified.

### Packet
A group of Observations that have a Timestamp, in common. This is commonly data that comes straight off the stream
(raw data). Known as LOOP data in weewx parlance.

### Location Packet
This is a specialized Packet that holds a Timestamp and a decimal latitude and decimal longitude.
Optionally, it may include an altitude.

### Stream Name
An optional unique name by which a Stream is known, selected by the client.

### Platform Name
An optional unique name by which a Platform is known, selected by the client.

### streamID
A unique id, identifying a Stream, selected by the server. It is a large, opaque number.

### platformID
A unique id, identifying a Platform, selected by the server. It is a large, opaque number.

### Authentication Token
A bit of JSON that conforms to the JSON Web Token standard.

### Stream
A unique piece of hardware or software that emits a stream of Packets. It is uniquely identified by a *streamID*. Every
Packet emitted by the Stream must include a valid Authentication Token, and a unique (to the Stream) Timestamp. The
interval between packets may be highly irregular. Individual Packets need not include all the same Observation types.

### Location Stream
This is a specialized stream that consists exclusively of Location Packets.

### Platform
A group of Streams that have a location in common. A Platform might be a stationary location, such as an industrial
siting, or it might be a mobile location, such as a vehicle or boat. It is known by a unique *platformID*. A Platform
has one or more streams associated with it, one of which must be a Location Stream. The platform's “current location” is
defined as the last Location Packet in its Location Stream. If it is a stationary platform, then the Location Stream
will have only one Location Packet in it.

## Configuration

In general, the system is designed to be as self-configuring as possible. The goal is to avoid having an operator sit at
a provisioning application, entering each and every stream and platform.

If chosen, the Stream Name and Platform Name can be used to find the corresponding *streamID* and *platformID*, but,
in this case, the names must be unique. They should also be readily identifiable.

For Stream Names, one possibility is a combination of the hostname and a UUID. Something like
`humpback-7fb9e1e7-665f-43f9-9816-971e46067fb8`. The hostname provides something recognizable, the UUID guarantees
uniqueness.

For Platform Names, something similar can be done using a combination of the location (or vehicle) name, and UUID, for
example, `ford150-2b083361-4a29-4091-bcf1-3875aa756e0a`.

The client must perform a login process to obtain the authorization token from the WeeRT server.
This token must be included in all mutable requests.

Before posting packets to a stream, it must exist on the server.




# Server data models
Data are stored in a MongoDB server.

## Stream data model

### Collection `streams_metadata`

Metadata associated with WeeRT streams are stored in a MongoDB collection with name `streams_metadata`.
Inside, each document describes a single stream:

| *Field*       | *Type*             | *Explanation*                                                     |
|---------------|--------------------|-------------------------------------------------------------------|
| `_id`         | `mongodb.ObjectID` | Unique *streamID* for the stream, assigned by the server          |
| `unit_group`  | `string`           | Which standard unit group is used by the stream                   |
| `name`        | `string`           | An optional unique name for the stream, assigned by the client    |
| `description` | `string`           | An optional free form description of the stream                   |

Example

```Javascript
{
  _id         : mongodb.ObjectID("566cc809afe61ddc22877c39"),
  unit_group  : "METRICWX",
  name        : "Boiler_owfs",
  description : "Onewire feed from boiler"
}
```

### Collection <span style="font-family:monospace">streams_<i>streamID</i>_packets</span>

The raw packet data coming off a stream is stored in a collection with name
<span style="font-family:monospace">streams_<i>streamID</i>_packets</span>, where
<i>streamID</i> is the ID of the stream. An example would be `streams_569aa06605be9995051ee8fa_packets`.

Inside, each document describes a single packet

Description of fields:

| *Field*              | *Type* | *Description*                                      |
|----------------------|--------|----------------------------------------------------|
| `_id`                | `Date` | A timestamp in milliseconds since the unix epoch   |
| *`observation type`* | *any*  | The value of the observation type at the timestamp |

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

### Collection `platforms_metadata`

Collection `platforms_metadata` holds metadata related information for a Platform. Each document consists of:


| *Field*       | *Type*             | *Description*                                              |
|---------------|--------------------|------------------------------------------------------------|
| `_id`         | `mongodb.ObjectID` | Unique *platformID* for the stream, assigned by the server |
| `location`    | `mongodb.ObjectID` | *streamID* of the associated Location Stream               |
| `name`        | `string`           | An optional, unique name for the Platform, assigned by the client|
| `description` | `string`           | An optional free form description of the Platform          |

Example:

```Javascript
{
  _id : mongodb.ObjectID("569aa06605be9995051ee8f9"),
  location: mongodb.ObjectID("569aa06605be9995051ee8fe"),
  name: "ford150-2b083361-4a29-4091-bcf1-3875aa756e0a",
  description: "Black Ford F-150 truck"
}
```

### Collection `platforms_streams`

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



## Unit model

### Collection `standard_unit_systems`

Each Standard Unit System is described by a document in the collection `standard_unit_systems`:

| *Field*  | *Type*               | *Description*                                                   |
|----------|----------------------|-----------------------------------------------------------------|
| `_id`    | `string`             | The Standard Unit System being described                        |
| `groups` | array of `UnitSpecs` | An array holding the unit groups recognized by the unit system. |

The structure `UnitSpecs` is described by

| *Field*         | *Type*   | *Description*                              |
|-----------------|----------|--------------------------------------------|
| `group`         | `string` | The name of a unit group                   |
| `unit`          | `string` | The units this group is in                 |

Example:

```Javascript
{
  _id : "METRICWX",
  groups : [ {group : temperature, unit : "degree_C"},
             {group : altitude,    unit : "meter"},
             {group : rain,        unit : "mm"}
             ...
           ]
}
```

WeeRT itself is agnostic to the set of units and their semantics. That is up to a client to interpret.

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

Note that in this example, the *platformID* and *streamID* are unknown. The platform and stream names will be used to
retrieve them or, if they don't exist, create a new platform or stream, and use the resultant *platformID* and
*streamID*.

Also, in this example, the platform and stream names are hardwired in, but, from weert's perspective, they don't have to
be. They could be autogenerated from the mac address or something else. In this approach is chosen,
the algorithm must arrive with the same name every time, and that name must be unique.

Schematically, the startup sequence would look something like this:

`GET /api/v1/login?user=me&password=pw`

Returns a token, which weewx would probably just save in a Python data structure (not in the config file).

`POST /api/v1/platforms {name: "Unique Platform Name", token: token}`

If the platform does not exist, this will create one and return an HTTP status code of 201 ("Success"). If the platform
already exists (which the weert server can determine because the name is unique), it returns status code of 400 ("Bad
request"). Either way, the URL of the platform is returned in the Location header of the response. Something like
`http://localhost/api/v1/platforms/123`.

Similar process with streams:

`POST /api/v1/streams {name: "Unique Stream Name", token: token}`

The URL of the stream is returned in the Location header. Example:
`http://localhost/api/v1/streams/456`

Now you have an URL for both the platform, and for the stream.

Start POSTing new packets to the stream:

`POST /api/v1/streams/456/packets {timestamp: 1234567890, outside_temperature=22.5...}`

Location header returns the URL of the packet, which you probably don't need, but that's considered "best practices."

# License & Copyright

Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
