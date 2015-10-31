# WeeRT Data Model
## Definitions
### Platform
A group of *instruments* that have a location in common. This might be a stationary location, such 
as an industrial siting, or a mobile location, such as a vehicle or boat. A platform can have multiple instruments.

The location may change with time, in which case the “present location” would be the last location.

A platform is identified by a unique *platformID*. This may or may not be a UUID.

A platform has zero or more instruments associated with it.

### Instrument
A unique piece of hardware or software that emits a stream of *packets*. 
It is known by unique *instrumentID*. This may or may not be a UUID.
 
### Packet
A group of observations that have a *instrument*, and *timestamp*, in common. 
This is commonly data that comes straight off the instrument (raw data). 
A timestamp must be unique within a stream of packets coming off an instrument (no duplicates).
The interval between packets may be highly irregular.

Sample packet:

    {
     timestamp : 1446158201379,
     instrument : instrumentID-4
     outside_temperature : 22.14,
     inside_temperature : 20.51
     barometer_pressure: 1004.2
     ...
    }

### Observation type
A specific measurable type, such as “outside temperature,” known by a name, such as `outside_temperature`. 
The name must be unique within an instrument. 

### Timestamp
The time, in milliseconds, since the unix epoch. This is the same definition that JavaScript uses. 


##Platform data model

### platforms

Metadata associated with a platform is stored in a MongoDB collection with name `platforms`. 
Inside, each document describes a single platform.

    {
      _id         : platformID-15,
      description : “Description of 1st platform”,
      instruments : [
                     instrumentID-4, 
                     instrumentID-2,
                     ...
                    ]
    }
    
    {
      _id         : platformID-21,
      description : “Description of 2nd platform”,
      instruments : [
                     instrumentID-22, 
                     instrumentID-29,
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
    <td style="font-family:monospace">instruments</td><td>[a881bc, d0785a, 09e45]</td><td>An array holding 
    the instrumentIDs of the member instruments</td>
  </tr>
</table>

### location_<i>platformID</i>

The location of the platform is given by a MongoDB collection with 
name <span style="font-family:monospace; font-weight:bold">location_<i>platformID</i></span>, where
<i><b>platformID</b></i> is the ID of the platform. Inside, each document describes the position of th
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

## Instrument data model

### packets_<i>instrumentID</i>

The raw packet data coming off an instrument is stored in a collection with name
<span style="font-family:monospace; font-weight:bold">packets_<i>instrumentID</i></span>, where
<i><b>instrumentID</b></i> is the ID of the instrument. Inside, each document describes a single packet

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