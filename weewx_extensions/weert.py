# weewx extension that sends data to weert
# Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>

import json
import os.path
import sys
import syslog
import time
import urlparse
import urllib
import urllib2
import Queue

import weewx.units
import weewx.restx

from weewx.restx import StdRESTful, RESTThread

class WeeRT(StdRESTful):
    """Weewx service for posting using to a Node RESTful server.
    
    Manages a separate thread WeeRTThread"""

    def __init__(self, engine, config_dict):
        
        super(WeeRT, self).__init__(engine, config_dict)

        _node_dict = weewx.restx.check_enable(config_dict, 'WeeRT')

        if _node_dict is None:
            return

        # Need either a streamID or a stream_name to proceed:        
        if (not _node_dict.get('stream_id') and
            not _node_dict.get('stream_name')):
            syslog.syslog(syslog.LOG_DEBUG, "weert: Data will not be posted."
                          " Need either stream_id or stream_name.")
            return
             
        # Get the database manager dictionary:
        _manager_dict = weewx.manager.get_manager_dict_from_config(
            config_dict, 'wx_binding')
        self.loop_queue = Queue.Queue()
        self.loop_thread = WeeRTThread(self.loop_queue,
                                       _manager_dict,
                                       **_node_dict)
        self.loop_thread.start()
        self.bind(weewx.NEW_LOOP_PACKET, self.new_loop_packet)

        syslog.syslog(syslog.LOG_INFO, "weert: LOOP packets will be posted.")

    def new_loop_packet(self, event):
        self.loop_queue.put(event.packet)


class WeeRTThread(RESTThread):
    """Concrete class for threads posting to a Node server"""

    DEFAULT_SERVER_URL = "http://localhost:3000"
    STREAM_ENDPOINT = "/api/v1/streams/"

    default_obs_types = ['outTemp',
                         'dewpoint',
                         'inTemp',
                         'outHumidity',
                         'barometer',
                         'windSpeed',
                         'windDir',
                         'dayRain']
    
    # Mapping from weewx names, to the names used in WeeRT:
    map = {'outTemp'    : 'outside_temperature',
           'dewpoint'   : 'dewpoint_temperature',
           'inTemp'     : 'inside_temperature',
           'outHumidity': 'outside_humidity',
           'barometer'  : 'barometer_pressure',
           'windSpeed'  : 'wind_speed',
           'windDir'    : 'wind_direction',
           'dayRain'    : 'day_rain'}

    def __init__(self, queue,
                 manager_dict,
                 protocol_name="WeeRT",
                 stream_id = None,
                 stream_name = None,
                 server_url=DEFAULT_SERVER_URL,
                 obs_types=default_obs_types,
                 max_backlog=sys.maxint, stale=60,
                 log_success=True, log_failure=True,
                 timeout=5, max_tries=1, retry_wait=5):
        """
        Initializer for the WeeMetThread class.
        
        Either stream_id or stream_name must be supplied.
        
        Parameters specific to this class:
          
          stream_id: A streamID provided by a WeeRT server.
          Required unless stream_name is given.
          
          stream_name: A unique name for the stream.
          Required unless stream_id is given.
        
          server_url: The URL for the WeeRT Node server.
          E.g., http://localhost:3000
        
          obs_types: A list of observation types to be sent to the Node
          server [optional]
        """        
        # Initialize my superclass
        super(WeeRTThread, self).__init__(queue,
                                          protocol_name=protocol_name,
                                          manager_dict=manager_dict,
                                          max_backlog=max_backlog,
                                          stale=stale,
                                          log_success=log_success,
                                          log_failure=log_failure,
                                          timeout=timeout,
                                          max_tries=max_tries,
                                          retry_wait=retry_wait)

        self.obs_types = obs_types
        
        # This should be something like http://localhost:3000/api/v1/streams
        stream_endpoint_url = urlparse.urljoin(
            server_url, WeeRTThread.STREAM_ENDPOINT)

        # See if we have a streamID
        if stream_id:
            # Yes. It gets simple. Form the URL for this streamID.
            streamid_url = stream_endpoint_url + '/' + stream_id
        else:
            # No. We must have a stream name. Use it to resolve to a packet
            # endpoint
            try:
                streamid_url = resolve_streamURL(stream_endpoint_url, stream_name)
            except urllib2.URLError, e:
                syslog.syslog(syslog.LOG_ERR,
                              "weert: Unable to get stream_name from server")
                syslog.syslog(syslog.LOG_ERR,
                              "****   Reason: %s" % e)
                return
            if not streamid_url:
                syslog.syslog(syslog.LOG_INFO,
                              "weert: Unable to resolve stream name %s" %
                              stream_name)
                return
        
        self.packets_url = streamid_url.rstrip(' /') + '/packets'

        syslog.syslog(syslog.LOG_NOTICE,
                      "weert: Publishing to %s" % self.packets_url)

    def process_record(self, record, dbmanager):
        """Specialized version of process_record that posts to a node server"""

        # Get the full record by querying the database ...
        full_record = self.get_record(record, dbmanager)
        # ... convert to Metric if necessary ...
        metric_record = weewx.units.to_METRICWX(full_record)
        
        # Instead of sending every observation type, send only those in
        # the list obs_types
        abridged = dict((x, metric_record.get(x)) for x in self.obs_types)
        
        # Convert timestamps to JavaScript style:
        abridged['timestamp'] = record['dateTime'] * 1000
        
        mapped = {}
        for k in abridged:
            new_k = WeeRTThread.map.get(k, k)
            mapped[new_k] = abridged[k] 
        
        req = urllib2.Request(self.packets_url)
        req.add_header('Content-Type', 'application/json')
        req.add_header("User-Agent", "weewx/%s" % weewx.__version__)

        self.post_with_retries(req, payload=json.dumps(mapped))
        
    def checkresponse(self, response):
        """Check the HTTP response code."""
        if response.getcode() == 201:
            # Success. Just return
            return
        else:
            for line in response:
                if line.startswith('Error'):
                    # Server signals an error. Raise an exception.
                    raise weewx.restx.FailedPost(line)

#==============================================================================
#                             UTILITIES
#==============================================================================

# The following two functions should probably be moved to a separate WeeRT
# utilities package.

def resolve_streamURL(stream_endpoint, stream_name):
    """Given a stream_name, return its URL. If a stream has not been
    allocated on the server, allocate one, and return that URL.
    
    stream_endpoint: The endpoint for WeeRT streams queries. Something
    like http://localhost:3000/api/v1/streams
    
    stream_name: A unique name for the stream
    """
     
    # First see if the stream name is already on the server    
    stream_url = lookup_streamURL(stream_endpoint, stream_name)

    if stream_url:
        # It has. Return it.
        return stream_url
    
    # It has not been allocated. Ask the server to allocate one for us. 
    # Build the request
    req = urllib2.Request(stream_endpoint)
    req.add_header('Content-Type', 'application/json')
    req.add_header("User-Agent", "weewx/%s" % weewx.__version__)
    
    # Set up the stream metadata:
    payload = json.dumps({"name" : stream_name,
                          "description" :"Stream for weewx",
                          "unit_group" : "METRICWX"})
    
    # Now send it off
    response = urllib2.urlopen(req, data=payload)
    if response.code == 201:
        stream_url = response.info()['location']
        # Parse the JSON
        metadata = json.loads(response.read())
        # The streamID is a plain string
        stream_id = str(metadata.get("_id", "N/A"))
        # Record the _id in the log:
        syslog.syslog(syslog.LOG_INFO, 
                      "weert: Server allocated streamID '%s' for stream name '%s'" % (stream_id, stream_name))
        return stream_url

    
def lookup_streamURL(stream_endpoint, stream_name):
    """Given a stream_name, ask the server what its URL is.
    Return None if not found.
    
    stream_endpoint: The endpoint for WeeRT streams queries. Something
    like http://localhost:3000/api/v1/streams
    
    stream_name: A unique name for the stream
    """
     
    # Query to look for a "name" field that matches the stream name
    query = {"name":{"$eq": stream_name}}
    # Encode it with the proper escapes
    param = urllib.urlencode({'query':json.dumps(query)})
    # Form the full URL
    full_url = urlparse.urljoin(stream_endpoint, '?%s' % param)

    # Hit the server
    response = urllib2.urlopen(full_url)
    result = response.read()
    urlarray = json.loads(result)
    return str(urlarray[0]) if urlarray else None
