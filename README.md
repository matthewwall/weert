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

3. Download WeeRT into a convenient directory, then cd into it.

4. Install the packages needed by WeeRT, by using npm:

    ```shell
    npm install
    ```

    Contrary to the implications of the word `install`, this does not actually install WeeRT itself.
    Instead, it downloads all of the packages used by WeeRT and installs them into a subdirectory `node_modules`,
    where WeeRT can use them.

5. Start WeeRT

    You can either start it simply:

    ```shell
    npm start
    ```

    or, to get debug messages, set the `DEBUG` environmental variable to `weert:*` before running:

    ```Shell
    DEBUG=weert:* npm start
    ```

## To install the WeeRT uploader in WeeWX


1. Make sure you are running weewx version 3.3 or later (WeeRT makes use of POST requests, which are
only supported by v3.3 or later.)

2. Add the following to `weewx.conf`:

    ```ini
    [StdRestful]
        ...
        [[WeeRT]]
            enable = true
            # Set to the URL of your instance of Node.
            node_url = http://localhost:3000
            # Set to the platform and stream IDs
	        platform_uuid = p1
	        stream_uuid = s1

    ...

    [Engine]
        [[Services]]
            ...
            restful_services = ..., weert.WeeRT

    ```

3. Make sure the `weert.py` module is in your `PYTHONPATH`.

4. Run `weewxd`

5. Open up a client at [http://localhost:3000](http://localhost:3000).

## To run the server test suites

1. Change directory (`cd`) into the WeeRT directory.

2. Install `jasmine-node`

    ```shell
    sudo npm install -g jasmine-node
    ```

3. Start the WeeRT server

    ```shell
    npm start
    ```

4. Open up another terminal and run the suites

    ```shell
    jasmine-node server
    ```

# More information

See the document [The WeeRT Data Model](DATAMODEL.md) for information about the data model used by
WeeRT. This document defines the various terms, as well as the relationship between different data structures.

See the document [The WeeRT RESTful API](API.md) for information about the WeeRT API.


# License & Copyright

Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.


