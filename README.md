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