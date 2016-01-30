"""Used to generate the example output"""
from subprocess import Popen, PIPE
import shlex
import json
import time

weert_url = "http://localhost:3000/api/v1/"

curl_cmd = ["curl", "-i", "--silent"]

margin = 85

START_TIME = 1454020559000
TIME_INTERVAL = 5000

def timestamp(i):
    return START_TIME + i * TIME_INTERVAL

def do_curl(endpoint, verb='GET', payload=None):
    """Do the curl command and parse the results."""

    # First make a copy of the basic command
    cmd = list(curl_cmd)
    # Add the verb
    cmd += ["-X", verb]
    # And the payload (if any)
    if payload:
        cmd += ["-H", "Content-type:application/json"]
        cmd += ["-d", "%s" % payload]
    # Add the URL
    cmd += [endpoint]

    # Fire off the curl command, collecting its standard output
    p = Popen(cmd, shell=False, stdout=PIPE)
    output, err = p.communicate()
    if p.wait():
        raise IOError("Invalid return code from curl")
    
    platform_url = None
    
    result =  ""
    current_line = "$ "
    for x in cmd:
        if len(current_line) + len(x) > margin-2:
            result += current_line + " \\\n"
            current_line = ">   "
        if ' ' in x:
            current_line += "'%s' " % x
        else:
            current_line += x + " "
    result += current_line + "\n"    

    for line in output.split('\n'):
        if line.startswith('Location:'):
            platform_url = line.split(' ')[1].strip()
        if line.startswith('{') or line.startswith('['):
            # Pretty print any JSON
            result += json.dumps(json.loads(line), sort_keys=True, indent=4, separators=(',', ': ')) + "\n"
        else:
            result += line

    return (result, platform_url)

def get_mapping():

    mapping = {}

    # Create a platform:
    mapping["POST_platforms"], platform_url1 = do_curl(weert_url + 'platforms', 
                                                       'POST', """{"name":"Bennys Ute", "description" : "Yellow, with black cap"}"""  )
    # Create another (not used)
    _, platform_url2 = do_curl(weert_url + 'platforms', 
                               'POST', 
                               '{"name":"Willies scooter", "description" : "Blue Yamaha"}')
 
    # Get all platforms
    mapping["GET_platforms_ref"], _ = do_curl(weert_url + 'platforms')
      
    # Get all platforms again, but by value
    mapping["GET_platforms_value"], _ = do_curl(weert_url + 'platforms?as=values')
 
    # Get a specific platform
    mapping["GET_platforms_platformID"], _ = do_curl(platform_url1)
 
    # Modify a specific platform
    mapping["PUT_platforms_platformID"], _ = do_curl(platform_url1, 
                                                     'PUT', 
                                                     '{"description" : "Yellow, with green cap"}')
  
    # Get the modified platform
    mapping["GET_platforms_platformID_mod1"], _ = do_curl(platform_url1)
  
    # POST a location record to a specific platform:
    mapping["POST_platforms_platformID_locations"], location_url1 = do_curl(platform_url1 + "/locations",
                                                                           'POST',
                                                                           '{"timestamp" : 1420070450000, "latitude": 45.2, "longitude" : -85.1, "altitude" : 12.9}')
    # Do another (not used):
    _, _ = do_curl(platform_url1 + "/locations",
                   'POST',
                   '{"timestamp" : 1420070580000, "latitude": 45.3, "longitude" : -85.0, "altitude" : 12.2}')

    # GET all locations (should be two):
    mapping["GET_platforms_platformID_locations"], _ = do_curl(platform_url1 + "/locations", 'GET')
    
    mapping["GET_platforms_platformID_locations_timestamp_latest"], _ = do_curl(platform_url1 + "/locations/latest", 'GET')
    
    # Get location at exact timestamp:
    mapping["GET_platforms_platformID_locations_timestamp_exact"], _ = do_curl(location_url1, 'GET')
    
    #*********************************** STREAMS *******************************

    mapping["POST_streams"], stream_url1 = do_curl(weert_url + 'streams',
                                                   'POST',
                                                   '{"name": "weather stream 412", "description": "WX station mounted on Bennys Ute", "unit_group": "METRICWX"}')
    
    # Post 4 packets:
    for i in range(4):
        m, p = do_curl(stream_url1 + "/packets",
                       'POST',
                       '{"timestamp": %d, "outside_temperature": %.1f, "inside_humidity":%.0f}' % (timestamp(i), 21.5+0.1*i, 45-i))
        if i==0:
            mapping["POST_streams_streamID_packets"], packet_url0 = m, p
            
    # And a 3rd
    
    # GET all packets
    mapping["GET_streams_streamID_packets"], _ = do_curl(stream_url1 + "/packets")

    # Do it again, but sort by inside humidity:
    mapping["GET_streams_streamID_packets_sort"], _ = do_curl(stream_url1 + "/packets?sort=inside_humidity")


    # Get an aggregation:
    mapping["GET_streams_streamID_packets_max"], _ = do_curl(stream_url1 + "/packets?agg_type=max&obs_type=outside_temperature")
    
    # Get last packet in the stream
    mapping["GET_streams_streamID_packets_timestamp_latest"], _ = do_curl(stream_url1 + "/packets/latest")

    # Get an exact matching timestamp:
    mapping["GET_streams_streamID_packets_timestamp_exact"], _ = do_curl(packet_url0)
    
    # Get the "last before" packet
    mapping["GET_streams_streamID_packets_timestamp_lastBefore"], _ = do_curl(stream_url1 + "/packets/%d?match=lastBefore" % (timestamp(3)-1000,))
    
    #*********************************** DELETIONS *******************************

    # Deletions have to wait until the end, because the thing they are deleting may be in use.
    
    # Delete a specific location record:
    mapping["DELETE_platforms_platformID_locations_timestamp"], _ = do_curl(location_url1, 'DELETE')
    
    # Delete a specific packet:
    mapping["DELETE_streams_streamID_packets_timestamp"], _ = do_curl(packet_url0, 'DELETE')
    
    # Delete a platform:
    mapping["DELETE_platforms_platformID"], _ = do_curl(platform_url1, 'DELETE')
   
    # Delete a non-existent platform
    mapping["DELETE_platforms_badID"], _ = do_curl(weert_url + 'platforms/564532f58719938114311ea3', 'DELETE')


     
    return mapping

import optparse
import sys

description = """Generates the WeeRT API markdown documentation from a template"""

usage = """%prog: template-file [--help]"""

def main():
    import string
    
    # Create a command line parser:
    parser = optparse.OptionParser(description=description, usage=usage)
    
    # Parse the command line:
    (options, args) = parser.parse_args()

    if not args:
        print >>sys.stdout, "missing template file"
        sys.exit(1)
        
    template_file = args[0]

    fd = open(template_file, 'r')
    buff=fd.read()

    mapping = get_mapping()
    
    template = string.Template(buff)
    md = template.safe_substitute(mapping)
    
    print "[//]: # (This Markdown file was generated from a template)"
    print "[//]: # (|         DO NOT EDIT!           |)"
    print "[//]: # (Edit the file API.md.tmpl instead)"
    
    print md
if __name__=="__main__" :
    main()
