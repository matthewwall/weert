"""Used to generate the example output"""
from subprocess import Popen, PIPE
import shlex
import json
import time

weert_url = "http://localhost:3000/api/v1/"

curl_cmd = ["curl", "-i", "--silent"]

def do_curl(endpoint, verb='GET', payload=None):
    """Do the curl command and parse the results."""

    # First make a copy of the basic command
    cmd = list(curl_cmd)
    # Add the verb
    cmd += ["-X", verb]
    # And the payload (if any)
    if payload:
        cmd += ["-H", "Content-type: application/json"]
        cmd += ["-d", "%s" % payload]
    # Add the URL
    cmd += [endpoint]
    

    # Fire off the curl command, collecting its standard output
    p = Popen(cmd, shell=False, stdout=PIPE)
    output, err = p.communicate()
    if p.wait():
        raise IOError("Invalid return code from curl")
    
    platform_url = None
    
    result =  "$ "
    result += " ".join(cmd)
    result += "\n"

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

    mapping["POST_platforms"], platform_url1 = do_curl(weert_url + 'platforms', 'POST', "{\"name\":\"Bennys Ute\", \"description\" : \"Yellow, with black cap\"}")
    _, platform_url2 = do_curl(weert_url + 'platforms', 'POST', "{\"name\":\"Willie's scooter\", \"description\" : \"Blue Yamaha\"}")
    
    mapping["GET_platforms_ref"], _ = do_curl(weert_url + 'platforms')
     
    # Do the example again, but by value
    mapping["GET_platforms_value"], _ = do_curl(weert_url + 'platforms?as=values')
    
    mapping["GET_platforms_platformID"], _ = do_curl(platform_url1)
    
    mapping["PUT_platforms_platformID"], _ = do_curl(platform_url1, 'PUT', "{\"description\" : \"Yellow, with green cap\"}")
    
    mapping["GET_platforms_platformID_mod1"], _ = do_curl(platform_url1)
    
    mapping["DELETE_platforms_platformID"], _ = do_curl(platform_url1, 'DELETE')
    
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
    
    print md
if __name__=="__main__" :
    main()
