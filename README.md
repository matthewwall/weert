# WeeRT
A real-time logging and display server, using Angular, MongoDB, Express, Node, and D3 (DMEAN? AMEND?)

## General architecture
- Uses a [Node](https://nodejs.org/) server with the [Express framework](http://expressjs.com/)
- The server offers a RESTful API for storing, retrieving, deleting, and editing platforms,
streams, and data.
- Mutating actions are sent on to clients through a Websocket connection (using [socket.io](http://socket.io/)),
allowing a real-time display.
- The server offers a web interface (using [Angular](http://angularjs.com))
for provisioning (things like setting up platforms and streams).
- Data are stored in a [MongoDB](https://www.mongodb.org/) server
- Real-time plots are done using [D3](http://d3js.org/).

For experimental purposes. Tested on Node V4.2.2, although other versions should work fine.

## To install the WeeRT server

1. Install Node.

2. Install MongoDB and get it running.

3. Download WeeRT into a convenient directory, then `cd` into it.

4. Download and install the packages needed by WeeRT, by using npm:

    ```shell
    npm install
    ```

5. Start WeeRT

    You can either start it simply:

    ```shell
    npm start
    ```

    or, to get debug messages, set the `DEBUG` environmental variable to `weert:*` before running:

    ```Shell
    DEBUG=weert:* npm start
    ```

This finishes the setup of the WeeRT Node server.

## To install the WeeRT uploader in WeeWX


1. Make sure you are running weewx version 3.3 or later (WeeRT uses POST requests, which are
supported only by v3.3 or later.)

2. Add the following to `weewx.conf`:

    ```ini
    [StdRestful]
        ...
        [[WeeRT]]
            enable = true
            # Set to the URL of your instance of the WeeRT Node server.
            weert_host = http://localhost:3000
            # Specify a unique name for your stream. If it does not exist on the server,
            # it will be allocated
	        stream_name = MySpecialStream

    ...

    [Engine]
        [[Services]]
            ...
            restful_services = ..., weert.WeeRT

    ```

3. Make sure the `weert.py` module is in your `PYTHONPATH`.

4. Run `weewxd`

5. Take a look at the weewx log output (file `/var/log/syslog` on many systems), and search for a line that looks
    something like

    ```
    Jan 30 09:17:42 myhost weewx[19770]: weert: Server allocated streamID '56acf036450538244d76a6fd' for stream name 'MySpecialStream'
    ```

    The hexadecimal number `56acf036450538244d76a6fd` is the *streamID* of the stream in the WeeRT database.
    It must be used to link the posted data to the realtime display. Unfortunately, at this point,
    this is a manual process. Eventually, the realtime display will be able to find the data by using the stream name.

6.  Edit the file `client/rt/rt.js` to reflect your streamID. When you are done, it will look something like this:

    ```Javascript
    // The streamID to be monitored should be put here:
    var streamID = "56acf036450538244d76a6fd";
    ```

7. Open up a client at [http://localhost:3000/rt.html](http://localhost:3000/rt.html).

## To run the server test suites

1. Install `jasmine-node`

    ```shell
    sudo npm install -g jasmine-node
    ```

2. Change directory (`cd`) into the WeeRT directory.

3. Start the WeeRT server

    ```shell
    npm start
    ```

4. Open up another terminal, and, again, `cd` into the WeeRT directory.

5. Run the test suites:

    ```shell
    npm test
    ```

# More information

See the document [The WeeRT Data Model](DATAMODEL.md) for information about the data model used by
WeeRT. This document defines the various terms, as well as the relationship between different data structures.

See the document [The WeeRT RESTful API](API.md) for information about the WeeRT API.


# License & Copyright

Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.


