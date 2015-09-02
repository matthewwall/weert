import json
import sys
import syslog
import time
import urllib2
import Queue

import weewx.units
import weewx.restx

from weewx.restx import StdRESTful, RESTThread

DEFAULT_NODE_URL = "http://localhost:3000/api/loop"

class WeeRT(StdRESTful):
    """Weewx service for posting using to a Node RESTful server.
    
    Manages a separate thread WeeRTThread"""

    def __init__(self, engine, config_dict):
        
        super(WeeRT, self).__init__(engine, config_dict)

        _node_dict = weewx.restx.check_enable(config_dict, 'WeeRT')

        if _node_dict is None:
            return        

        # Get the manager dictionary:
        _manager_dict = weewx.manager.get_manager_dict_from_config(config_dict,
                                                                   'wx_binding')
        self.loop_queue = Queue.Queue()
        self.loop_thread = WeeRTThread(self.loop_queue,  
                                       _manager_dict,
                                       protocol_name="WeeRT", 
                                       **_node_dict)
        self.loop_thread.start()
        self.bind(weewx.NEW_LOOP_PACKET, self.new_loop_packet)

        syslog.syslog(syslog.LOG_INFO, "wee_node: LOOP packets will be posted.")

    def new_loop_packet(self, event):
        self.loop_queue.put(event.packet)


class WeeRTThread(RESTThread):
    """Concrete class for threads posting to a Node server"""
    

    default_obs_types = ['dateTime',
                         'usUnits',
                         'outTemp',
                         'dewpoint',
                         'inTemp',
                         'outHumidity',
                         'barometer',
                         'windSpeed',
                         'windDir',
                         'dayRain']

    def __init__(self, queue,
                 manager_dict,
                 protocol_name,
                 node_url = DEFAULT_NODE_URL,
                 obs_types = default_obs_types,
                 max_backlog=sys.maxint, stale=60,
                 log_success=True, log_failure=True,
                 timeout=5, max_tries=1, retry_wait=5):

        """
        Initializer for the WeeMetThread class.
        
        Required parameters:

          queue: An instance of Queue.Queue where the packets will appear.
          
        Optional parameters:
        
          node_url: The endpoint URL for the Node server
        
          obs_types: A list of observation types to be sent to the Node
          server [optional]
        
          max_backlog: How many records are allowed to accumulate in the queue
          before the queue is trimmed.
          Default is sys.maxint (essentially, allow any number).
          
          stale: How old a record can be and still considered useful.
          Default is 60 (a minute).
          
          log_success: If True, log a successful post in the system log.
          Default is True.
          
          log_failure: If True, log an unsuccessful post in the system log.
          Default is True.
          
          max_tries: How many times to try the post before giving up.
          Default is 1
          
          timeout: How long to wait for the server to respond before giving up.
          Default is 5 seconds.        

          retry_wait: How long to wait between retries when failures.
          Default is 5 seconds.
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

        self.node_url = node_url
        self.obs_types = obs_types
        syslog.syslog(syslog.LOG_NOTICE, "wee_node: publishing to Node server at %s" % self.node_url)

    def process_record(self, record, dbmanager):
        """Specialized version of process_record that posts to a node server."""

        # Get the full record by querying the database ...
        _full_record = self.get_record(record, dbmanager)
        # ... convert to US if necessary ...
        _us_record = weewx.units.to_US(_full_record)
        
        # Instead of sending every observation type, send only those in
        # the list obs_types
        _abridged = dict((x, _us_record.get(x)) for x in self.obs_types)
        
        # Convert timestamps to JavaScript style:
        _abridged['dateTime'] *= 1000
        
        _req = urllib2.Request(self.node_url)
        _req.add_header('Content-Type', 'application/json')
        _req.add_header("User-Agent", "weewx/%s" % weewx.__version__)

        self.post_with_retries(_req, payload=json.dumps({'packet' : _abridged}))
        
    def check_response(self, response):
        """Check the HTTP response code."""
        if response.getcode() == 200:
            # Success. Just return
            return
        else:
            for line in response:
                if line.startswith('ERROR'):
                    # Bad login. No reason to retry. Raise an exception.
                    raise weewx.restx.FailedPost(line)
