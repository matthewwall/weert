# Data model used by WeeRT
The following describes the data model used by WeeRT.

# Platform
A platform is a group of instruments that have a location in common. This might be a stationary location, 
such as an industrial siting, or a mobile location, such as a vehicle or boat. 
A platform can have multiple instruments.

The data for each platform is stored in its own MongoDB database and is known by a unique name. For example, 
if you were storing the data for an RV, then its name might be `rv_mobile`. If this were the case,
then its MongoDB database could be retrieved with the following (using JavaScript on Node):

    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost:27017/rv_mobile';
    var mobileDB = undefined;
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        mobileDB = db;
    });

The platform database includes

* platform metadata;
* location data;
* zero or more instruments.

## Platform metadata
In each platform database these is a collection with the name `metadata` that contains information about the
platform. It is structured like this:

    // "metadata"
    {
    UUID: c4616583-b656-49ab-af4c-50bc860bcb0e,
    description : "Dad's RV"
    }


## Location data
In each platform database these is a collection with the name `location` that consists of a set of location records.
Each location record includes a timestamp, a latitude, longitude, and, optionally, an altitude (in meters):

    // location
    {_id: ISODate(2011-04-15 01:55:00), lat: 41.720185, lon: -119.949091}
    {_id: ISODate(2011-04-15 02:00:00), lat: 41.720581, lon: -119.949085}
    {_id: ISODate(2011-04-15 02:05:00), lat: 41.723591, lon: -119.948801}
    {_id: ISODate(2011-04-15 02:10:00), lat: 41.726931, lon: -119.948253}
      ...

The “present location” is the last known location.

## Instruments
The actual measurements resides in a set of collections used for each instrument, all starting with the instrument
name. For example, if the instrument name was "WMR100," then the collections would be named

    WMR100.metadata
    WMR100.loop_data
    WMR100.archive_data

### metadata
The collection with name suffix `.metadata` holds meta information about the instrument. This consists of

    // instrument_name.metadata
    {
    UUID: 866df54e-a02a-4a99-865a-a72705d3ab3b,
    description: "The Oregon Scientific WMR100N, mounted on the roof"
    }
    
### loop_data
The collection with suffix `.loop_data` holds the raw data coming off the instrument. As this can be quite
voluminous, this is usually a "capped collection" of limited size. The time between loop packets,
as well as their contents, can be highly irregular. All packets must include the key `_id` with the
timestamp of the measurements. The unit system is always the weewx [`METRICWX`](#unit_systems), described below.

    // instrument_name.loop_data
    {_id: ISODate(1912-04-15 00:00:11), unit_system: metricwx, wind_speed: 1.2, wind_direction: 203, outside_temperature:12.3}
    {_id: ISODate(1912-04-15 00:00:13), unit_system: metricwx, inside_temperature: 22.6}
    {_id: ISODate(1912-04-15 00:00:19), unit_system: metricwx, barometer_pressure: 1002.8}
    {_id: ISODate(1912-04-15 00:00:22), unit_system: metricwx, wind_speed: 0.3, wind_direction: 229, outside_temperature:12.4}    
    
### archive data
The collection with suffix `.archive_data` holds data aggregated over an "archive interval." While the interval
is usually quite regular, it can change with time. All records must include the key `_id` with the
timestamp of the measurement, a key `unit_system` with the unit system used in the record, and a key `interval`
with the length of the interval in milliseconds.

    // instrument_name.archive_data
    {_id: ISODate(1912-04-15 00:00:10), interval: 300000, unit_system: metricwx, 
     outside_temperature:12.4, inside_temperature:22.6, barometer_pressure: 1002.5, wind_speed: 1.2, wind_direction: 203}
    {_id: ISODate(1912-04-15 00:00:15), interval: 300000, unit_system: metricwx, 
     outside_temperature:12.5, inside_temperature:22.4, barometer_pressure: 1002.4, wind_speed: 0.8, wind_direction: 213}
    {_id: ISODate(1912-04-15 00:00:20), interval: 300000, unit_system: metricwx, 
     outside_temperature:12.5, inside_temperature:22.3, barometer_pressure: 1002.5, wind_speed: 0.7, wind_direction: 214}
    
# Observation types
The names of all observation types should consist of two parts, separated by an underscore ("`_`"). 
The first part is the name of the observation, the second the unit group to which it belongs. For example,

    outside_temperature

is the temperature outside, which is a member of the unit group `temperature`. Unit groups are used to cluster
similar observations by the unit system they use.

# <a id="unit_systems">Unit systems</a>
There are three different places where unit systems come into play.
 
* Units used for transport (via a RESTful API or websocket subscription);
* Units used for storage in the database;
* Units used for display.

This document covers only the first two.

Generally, there is no difference between the API units and the storage units. The exception is timestamps. 

## Timestamps

### RESTful API
Timestamps should be sent under key `timestamp`. and as an integer value representing the number of _milliseconds_ since 
1 January 1970 00:00:00 UTC (the Unix Epoch), that is, in [JavaScript style]
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date).

### MongoDB
Timestamps are stored in the MongoDB database as type 
[ISODate](http://docs.mongodb.org/manual/core/shell-types/#date), which, in JavaScript, 
translates to a `Date` object. 

The timestamp should be stored under key `_id`, a required key for every MongoDB document. It is also required
that it be unique. MongoDB will automatically index it. 

## All other types
For all other types besides timestamps, the same units are used in transport as in the database. They are
always in the _metric_ unit system. Exactly which unit depends on the unit group a measurement belongs to.
The measurement groups, and their corresponding metric unit, is given in the following table. Note that with
the exception of entries marked with an asterisk (*), this corresponds to the weewx `METRICWX` unit system.


<table style="font-family:monospace">
<tr style="font-family:sans-serif"><td><strong>Unit group</strong></td><td><strong>Unit</strong></td></tr>
<tr><td>altitude</td><td>meter</td></tr>
<tr><td>amp</td><td>amp</td></tr>
<tr><td>count</td><td>count</td></tr>
<tr><td>data</td><td>byte</td></tr>
<tr><td>degree_day</td><td>degree_C_day</td></tr>
<tr><td>deltatime</td><td>second</td></tr>
<tr><td>direction</td><td>degree_compass</td></tr>
<tr><td>distance</td><td>km</td></tr>
<tr><td>elapsed</td><td>second</td></tr>
<tr><td>energy</td><td>watt_hour</td></tr>
<tr><td>interval</td><td>minute</td></tr>
<tr><td>length</td><td>cm</td></tr>
<tr><td>moisture</td><td>centibar</td></tr>
<tr><td>humidity<sup>*</sup></td><td>percent</td></tr>
<tr><td>power</td><td>watt</td></tr>
<tr><td>pressure</td><td>mbar</td></tr>
<tr><td>radiation</td><td>watt_per_meter_squared</td></tr>
<tr><td>rain</td><td>mm</td></tr>
<tr><td>rainrate</td><td>mm_per_hour</td></tr>
<tr><td>speed</td><td>meter_per_second</td></tr>
<tr><td>temperature</td><td>degree_C</td></tr>
<tr><td>time</td><td>unix_epoch</td></tr>
<tr><td>uv</td><td>uv_index</td></tr>
<tr><td>volt</td><td>volt</td></tr>
<tr><td>volume</td><td>litre</td></tr>
</table>


