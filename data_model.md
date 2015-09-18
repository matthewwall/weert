# Data model used by WeeRT
The following describes the data model used by WeeRT.

# Platform
A platform is a group of instruments that have a location in common. 
This might be a stationary location, such as an industrial siting, or a mobile location, such as a vehicle or boat. 
A platform can have multiple instruments.

The location may change with time, in which case the “present location” would be the last known location.

Each platform has its own MongoDB database and is known by a unique name. For example, if the name
was `rv_mobile`, then the database can be retrieved by

    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost:27017/rv_mobile';
    var mobileDB = undefined;
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        mobileDB = db;
    });

A platform consists of

* platform metadata;
* location data;
* zero or more instruments.

## Platform metadata
In each platform database these is a collection with the name `metadata` that contains information about the
platform. It is structured like this:

    // "metadata"
    {
    UUID: c4616583-b656-49ab-af4c-50bc860bcb0e,
    description : "Dad's RV",
    }


## Location data
In each platform database these is a collection with the name `location` that consists of a set of location records.
Each location record includes a timestamp, a latitude, longitude, and, optionally, altitude (in meters):

    // location
    {_id: ISODate(2011-04-15 01:55:00), lat: 41.720185, lon: -119.949091}
    {_id: ISODate(2011-04-15 02:00:00), lat: 41.720581, lon: -119.949085}
    {_id: ISODate(2011-04-15 02:05:00), lat: 41.723591, lon: -119.948801}
    {_id: ISODate(2011-04-15 02:10:00), lat: 41.726931, lon: -119.948253}
      ...

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
timestamp of the measurements, and key `unitSystem` with the unit system used in the packet.

    // instrument_name.loop_data
    {_id: ISODate(1912-04-15 00:00:11), unitSystem: metric, wind_speed: 1.2, wind_direction: 203, outside_temperature:12.3}
    {_id: ISODate(1912-04-15 00:00:13), unitSystem: metric, inside_temperature: 22.6}
    {_id: ISODate(1912-04-15 00:00:19), unitSystem: metric, barometer_pressure: 1002.8}
    {_id: ISODate(1912-04-15 00:00:22), unitSystem: metric, wind_speed: 0.3, wind_direction: 229, outside_temperature:12.4}    
    
### archive data
The collection with suffix `.archive_data` holds data aggregated over an "archive interval." While the interval
is usually quite regular, it can change with time. All records must include the key `_id` with the
timestamp of the measurement, a key `unitSystem` with the unit system used in the record, and a key `interval`
with the length of the interval in milliseconds.

    // instrument_name.archive_data
    {_id: ISODate(1912-04-15 00:00:10), interval: 300000, unitSystem: metric, 
     outside_temperature:12.4, inside_temperature:22.6, barometer_pressure: 1002.5, wind_speed: 1.2, wind_direction: 203}
    {_id: ISODate(1912-04-15 00:00:15), interval: 300000, unitSystem: metric, 
     outside_temperature:12.5, inside_temperature:22.4, barometer_pressure: 1002.4, wind_speed: 0.8, wind_direction: 213}
    {_id: ISODate(1912-04-15 00:00:20), interval: 300000, unitSystem: metric, 
     outside_temperature:12.5, inside_temperature:22.3, barometer_pressure: 1002.5, wind_speed: 0.7, wind_direction: 214}
    
# Data

## Timestamps
All packets and records must include a key `_id`, holding the timestamp. MongoDB requires
the key, and requires that it be unique. MongoDB will index it. 
Generally, it is the MongoDB type [ISODate](http://docs.mongodb.org/manual/core/shell-types/#date), which
translates to a JavaScript `Date` object

## unitSystem
This holds the unit system in use in a packet or record. Choices are

* `metric`
* `US`

## measurements
All measurement names should consist of two parts, separated by an underscore ("`_`"). The first part is the name
of the measurement, the second the unit group it belongs to. For example,

    outside_temperature

is the temperature outside, which is a member of the unit group `temperature`. Unit groups are used to cluster
similar observations by the unit system they use.
