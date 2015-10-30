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

# RESTful API

## /api/loop
### GET

    /api/loop?instrumentID=UUID&start=XXXXX&stop=YYYYY&limit=N&sort=sortspec
    
Get all packets from the instrument with ID `UUID` and with timestamps between `XXXXX` and `YYYYY`, inclusive. 
If `XXXXX` is missing, then start with the first available packet. 
If `YYYYY` is missing, then end with the last available packet.

If `limit` is given, then limit the number of returned packets to `N`.

If `sort` is given, then sort the results using <i>sortspec</i>, an escaped JSON object.
An example <i>sortspec</i> would be `{timestamp:-1}`, that is, return the results with descending timestamps.

Sample URL (with a <i>sortspec</i> of `{timestamp:-1}`):

    http://localhost:3000/api/loop?instrument=801a8409cd&start=1446158201000&stop=1449260201000&limit=5&sort=%7B%22timestamp%22%3A-1%7D
  
Result is returned in the response body as an array holding the packets satisfying the search criteria, encoded
in JSON.

    [{"wind_speed":4.4704,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":263,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159220000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":252,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159218000},
     {"wind_speed":2.6822,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":276,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159216000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":232,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159214000},
     {"wind_speed":2.2352,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":232,"outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159212000}]

Returns a status of `400` if the `instrumentID` does not exist. Additional details are in the HTTP response body.


### POST

    /api/loop

Post a LOOP packet to the database. The packet should be contained as a JSON payload in the body of the POST. The packet
must contain keyword `timestamp`, holding the unix epoch time in <i>milliseconds</i> (JavaScript style).

There is no enforcement of the unit system used in the packet, 
but best practices is to use the weewx `METRICWX` system.

Example packet:

    {"wind_speed":4.4704,"barometer_pressure":1017.6623,"day_rain":5.842,"inside_temperature":20.22,"wind_direction":263,
     "outside_temperature":14.72,"outside_humidity":80,"dewpoint_temperature":11.30,"timestamp":1446159220000}

## /api/loop/aggregate
### GET

    /api/loop/aggregate?instrumentID=UUID&start=XXXXX&stop=YYYYY&obs_type=observation&aggregate_type=agg

Get the aggregate `agg` of observation type `observation` between timestamps `XXXXX` and `YYYYY` inclusive.
If `XXXXX` is missing, then start with the first available packet. 
If `YYYYY` is missing, then end with the last available packet.

Choices for the aggregation type `agg` include `min`, `max`, `sum`, and `avg`. 
If the aggregation type `agg` is missing, then use `avg`.

If the observation type `observation` is not in the collection, then `null` will be returned.

Example request:

    http://localhost:3000/api/loop/aggregate?instrument=801a8409cd&start=1446158201000&stop=1449260201000&aggregate_type=min&obs_type=outside_temperature
    
Result is returned in the response body as a single value, encoded in JSON.

Returns a status of `400` if the `instrumentID` does not exist. Additional details are in the HTTP response body.
