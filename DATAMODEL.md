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

| *Field*       | *Type*             | *Explanation*                                                |
|---------------|--------------------|--------------------------------------------------------------|
| `_id`         | `mongodb.ObjectID` | Unique *streamID* for the stream, assigned by the server     |
| `name`        | `string`           | Unique name for the stream, assigned by the client           |
| `description` | `string`           | A free form description of the stream                        |

Example

```Javascript
{
  _id         : mongodb.ObjectID("566cc809afe61ddc22877c39"),
  name        : "Boiler_owfs",
  description : "Onewire feed from boiler",
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


# License & Copyright

Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.
