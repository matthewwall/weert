# WeeRT Data Model
## Definitions
### Platform
A group of *streams* that have a location in common. This might be a stationary location, such 
as an industrial siting, or a mobile location, such as a vehicle or boat. A platform can have multiple streams.

The location may change with time, in which case the “present location” would be the last location.

A platform is identified by a unique *platformID*. This may or may not be a UUID.

A platform has zero or more streams associated with it.

### Stream
A unique piece of hardware or software that emits a stream of *packets*. 
It is known by unique *streamID*. This may or may not be a UUID.
 
### Packet
A group of observations that have a *stream*, and *timestamp*, in common. 
This is commonly data that comes straight off an instrument of some kind (raw data).
Timestamps within a stream must be unique (no duplicates).
The interval between packets may be highly irregular.

Sample packet:

```
{
 timestamp : 1446158201379,
 outside_temperature : 22.14,
 inside_temperature : 20.51,
 barometer_pressure: 1004.2
 ...
}
```

### Observation type
A specific measurable type, such as “outside temperature,” known by a name, such as `outside_temperature`. 
The name must be unique within a stream. 

### Timestamp
The time, in milliseconds, since the unix epoch. This is the same definition that JavaScript uses. 


##Platform database model

### platforms_metadata

Metadata associated with WeeRT platforms are stored in a MongoDB collection with name `platforms_metadata`. 
Inside, each document describes a single platform.

```
{
  _id         : 566cc7c8afe61ddc22877c35,
  name        : "Name for 1st platform"
  description : “Description of 1st platform”,
  join        : "7620",
  streams     : [
                   566cc809afe61ddc22877c37,
                   566cc809afe61ddc22877c38
                ]
}

{
  _id         : 566cc809afe61ddc22877c36,
  name        : "Name for 2nd platform"
  description : “Description of 2nd platform”,
  join        : "7621",
  streams     : [
                   566cc809afe61ddc22877c39,
                   566cc809afe61ddc22877c40
                ]
}

...
```

Description of fields:

| *Field*       | *Example*                                              | *Explanation*                                          |
|---------------|--------------------------------------------------------|--------------------------------------------------------|
| `_id`         | `566cc809afe61ddc22877c36`                             | The `platformID` for this platform                     |
| `name`        | car_number_54                                          | A name for the platform                                |
| `description` | V8 Buick station wagon                                 | A free form description of the platform                |
| `join`        | 32038                                                  | An optional key to an external database                |
| `streams`     | [566cc809afe61ddc22877c39, 566cc809afe61ddc22877c40]   | An array holding the *streamIDs* of the member streams |

### platforms_<i>platformID</i>_locations

The location of a specific platform is given by a MongoDB collection with 
name <span style="font-family:monospace; font-weight:bold">platforms_<i>platformID</i>_locations</span>, where
<i><b>platformID</b></i> is the ID of the platform. Inside, each document describes the position of the
platform at a given time.

```json
{
  _id : 1446158201379,
  latitude: 44.215,
  longitude: -122.984,
  altitude: 416.2
}
...
```

Description of fields:

| *Field*     | *Example*       | *Explanation*                                                      |
|-------------|-----------------|--------------------------------------------------------------------|
| `_id`       | `1446158201379` | A timestamp in milliseconds since the Unix epoch                   |
| `latitude`  | 44.215          | The latitude in decimal degrees (negative for southern hemisphere) |
| `longitude` | -122.984        | The longitude in decimal degrees (negative for western hemisphere) |
| `altitude`  | 416.2           | The altitude in meters                                             |


For a given time, the "position" of the platform is the last available position for that time. Interpolation between
locations is not done.

## Stream data model

### streams_metadata

Metadata associated with WeeRT streams are stored in a MongoDB collection with name `streams_metadata`. 
Inside, each document describes a single stream:

```
{
  _id         : 566cc809afe61ddc22877c39,
  name        : "Boiler_owfs",
  description : “Onewire feed from boiler”,
  join        : "87340",
  model       : "DS18B20"
}

{
  _id         : 566cc809afe61ddc22877c40,
  name        : "J-42VP2",
  description : “Weather station on roof of Bldg J-42”,
  join        : "912",
  model       : "Davis VantagePro2"
}

...
```
    
Description of fields:

| *Field*       | *Example*                  | *Explanation*                           |
|---------------|----------------------------|-----------------------------------------|
| `_id`         | `566cc809afe61ddc22877c39` | The unique *streamID* for the stream    |
| `name`        | "Boiler_owfs"              | A name for the stream                   |
| `description` | "Onewire feed from boiler" | A free form description of the stream   |
| `join`        | 87340                      | An optional key to an external database |
| `model`       | DS18820                    | A string with the hardware name         |



### streams_<i>streamID</i>_packets

The raw packet data coming off a stream is stored in a collection with name
<span style="font-family:monospace; font-weight:bold">streams_<i>streamID</i>_packets</span>, where
<i><b>streamID</b></i> is the ID of the stream. 

Inside, each document describes a single packet

```
{
  _id : 1446158201379,
  outside_temperature: 11.928,
  inside_temperature: 20.12,
  barometer_pressure: 1001.9,
  wind_speed: 3.2,
  wind_direction: 275
  ...
}
...
```

Description of fields:

| *Field*              | *Example*     | *Explanation*                                      |
|----------------------|---------------|----------------------------------------------------|
| `_id`                | 1446158201379 | A timestamp in milliseconds since the unix epoch   |
| *`observation type`* | *value*       | The value of the observation type at the timestamp |

There can be any number of different observation types in a packet, but only one entry per type.

# License & Copyright

Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.


