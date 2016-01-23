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
    
    print "\n\n\n"
    print "```Shell"
    print "$ ", " ".join(cmd)

    for line in output.split('\n'):
        if line.startswith('Location:'):
            platform_url = line.split(' ')[1].strip()
        if line.startswith('{'):
            # Pretty print any JSON
            print json.dumps(json.loads(line), sort_keys=True, indent=4, separators=(',', ': '))
        else:
            print line
    print "```"
    return platform_url

platform_url = do_curl(weert_url + 'platforms', 'POST', "{\"name\":\"Bennys Ute\", \"description\" : \"Yellow, with black cap\"}")

print "platform_url=", platform_url

do_curl(platform_url)