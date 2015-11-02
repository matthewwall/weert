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
This is commonly data that comes straight off an instrument of some kind(raw data). 
Timestamps within a stream must be unique (no duplicates).
The interval between packets may be highly irregular.

Sample packet:

    {
     timestamp : 1446158201379,
     outside_temperature : 22.14,
     inside_temperature : 20.51
     barometer_pressure: 1004.2
     ...
    }

### Observation type
A specific measurable type, such as “outside temperature,” known by a name, such as `outside_temperature`. 
The name must be unique within a stream. 

### Timestamp
The time, in milliseconds, since the unix epoch. This is the same definition that JavaScript uses. 


##Platform data model

### platforms_metadata

Metadata associated with WeeRT platforms are stored in a MongoDB collection with name `platforms_metadata`. 
Inside, each document describes a single platform.

    {
      _id         : platformID-15,
      description : “Description of 1st platform”,
      join        : "7620",
      streams : [
                     streamID-4, 
                     streamID-2,
                     ...
                ]
    }
    
    {
      _id         : platformID-21,
      description : “Description of 2nd platform”,
      join        : "7621",
      streams : [
                     streamID-22, 
                     streamID-29,
                     ...
                ]
    }

    ...
    
Description of fields:
<table>
  <tr style="font-style:italic; font-weight:bold">
    <td>Field</td><td>Example</td><td>Explanation</td>
  <tr>
    <td style="font-family:monospace">_id</td><td>28044a8db2</td><td>The <i>platformID</i> for the platform</td>
  </tr>
  <tr>
    <td style="font-family:monospace">description</td><td>"Car number 54"</td><td>A free form description of the platform</td>
  </tr>
  <tr>
    <td style="font-family:monospace">join</td><td>"32038"</td><td>Frequently, data about a platform is held in
     an external database. The key to this external data can be stored here. [optional]</td>
  </tr>
  <tr>
    <td style="font-family:monospace">streams</td><td>[a881bc, d0785a, 09e45]</td><td>An array holding 
    the streamIDs of the member streams</td>
  </tr>
</table>

### platforms_<i>platformID</i>_locations

The location of a specific platform is given by a MongoDB collection with 
name <span style="font-family:monospace; font-weight:bold">platforms_<i>platformID</i>_locations</span>, where
<i><b>platformID</b></i> is the ID of the platform. Inside, each document describes the position of the
platform at a given time.

    {
      _id : 1446158201379,
      latitude: 44.215,
      longitude: -122.984
    }
    ...

Description of fields:
<table>
  <tr style="font-style:italic; font-weight:bold">
    <td>Field</td><td>Example</td><td>Explanation</td>
  <tr>
    <td style="font-family:monospace">_id</td><td>1446158201379</td><td>A timestamp in milliseconds since the unix epoch</td>
  </tr>
  <tr>
    <td style="font-family:monospace">latitude</td><td>44.215</td><td>The latitude</td>
  </tr>
  <tr>
    <td style="font-family:monospace">longitude</td><td>-122.984</td><td>The longitude</td>
  </tr>
</table>

For a given time, the "position" of the platform is the last available position for that time. Interpolation between
locations is not done.

## Stream data model

### streams_metadata

Metadata associated with WeeRT streams are stored in a MongoDB collection with name `streams_metadata`. 
Inside, each document describes a single stream:

    {
      _id         : streamID-4,
      description : “Onewire feed from boiler”,
      join        : "87340",
      model:      : "DS18B20"
    }
    
    {
      _id         : streamID-22,
      description : “Weather station on roof of Bldg J-42”,
      join        : "912",
      model       : "Davis VantagePro2"
    }

    ...
    
Description of fields:
<table>
  <tr style="font-style:italic; font-weight:bold">
    <td>Field</td><td>Example</td><td>Explanation</td>
  <tr>
    <td style="font-family:monospace">_id</td><td>98184b8e2</td><td>The <i>streamID</i> for the stream</td>
  </tr>
  <tr>
    <td style="font-family:monospace">description</td><td>"Feed from HVAC modbus gateway"</td><td>A free form description of the stream.</td>
  </tr>
  <tr>
    <td style="font-family:monospace">join</td><td>"32038"</td><td>Frequently, data about a stream is held in
     an external database. The key to this external data can be stored here. [optional]</td>
  </tr>
  <tr>
    <td style="font-family:monospace">model</td><td>"MB_GW-2"</td><td>A string with the hardware name [optional]</td>
  </tr>
</table>

### streams_<i>streamID</i>_packets

The raw packet data coming off a stream is stored in a collection with name
<span style="font-family:monospace; font-weight:bold">streams_<i>streamID</i>_packets</span>, where
<i><b>streamID</b></i> is the ID of the stream. 

Inside, each document describes a single packet

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

Description of fields:
<table>
  <tr style="font-style:italic; font-weight:bold">
    <td>Field</td><td>Example</td><td>Explanation</td>
  <tr>
    <td style="font-family:monospace">_id</td><td>1446158201379</td><td>A timestamp in milliseconds since the unix epoch</td>
  </tr>
  <tr>
    <td style="font-family:monospace"><i>observation type</i></td><td><i>value</i></td><td>The value of the observation type at the timestamp</td>
  </tr>
</table>

There can be any number of different observation types in a packet, but only one entry per type. 