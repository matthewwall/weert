# Authentication and Authorization

Goals for the WeeRT authentication and authorization system include
- Can be managed using shell scripts;
- Abstract enough that different policies can be easily implemented;
- Uses industry standards.

## Authentication

Authentication is based on the [JSON Web Token](https://jwt.io/) (JWT) standard. A JWT token is a text-based token that
can carry an arbitrary payload, as well as other features, such as time to live (TTL). It is then signed with a
password, which allows a token to be authenticated. Because the token is text based, it is easy to transfer by either
RESTful services, email, or even cut-and-paste.

There are APIs available in many languages to create and decode JWTs.

Except for obtaining tokens, there is no "login" procedure with WeeRT. The presentation of the proper token is all
that's needed to access all the other RESTful APIs (assuming, of course, that the user presenting the token
has the necessary permissions to perform the action).


### Obtaining a token

New tokens are obtained in two possible ways
- through a protected RESTful interface, which requires a password;
- through a WeeRT JavaScript API. This may be a more useful option for shell scripts, in case there is no
WeeRT server running.

#### RESTful interface

A token can be provided through a RESTful interface, from a running WeeRT server, using the following API.

```
POST /api/v1/admin/users
```

**JSON input**

| *Name*      | *Type* | *Description*                 |
|:------------|:-------|-------------------------------|
| `password`  | string | Authentication of poster      |
| `username`  | string | Name of the new user          |
| `usergroup` | string | The group the user belongs to |

**Return status**

| *Status* | *Meaning*                         |
|:---------|-----------------------------------|
| 201      | Success                           |
| 401      | Invalid password ("Unauthorized") |
| 415      | Invalid content type              |

This interface will create a new user with name `username`, belonging to group `usergroup` and return the token
in the response body.

Additional details <del>are</del> will eventually appear in the [The WeeRT RESTful API](API.md).


#### JavaScript API

To be determined.

### Using a token
Once obtained, it is up to the client to store the token, such as in a configuration file.

## Authorization

Authorization is based on a resource, a verb, and an identify. This is done through a JavaScript
function with signature

```
  function(usergroup, verb, endpoint)
```

where

| Parameter   | Type    | Description                                                                      |
|:------------|:--------|----------------------------------------------------------------------------------|
| `usergroup` | String  | The user group the requester belongs to.                                         |
| `verb`      | String  | The HTTP action to be undertaken (`POST`, `GET`, *etc.*)                         |
| `endpoint`  | String  | The URL, stripped of the host and mount point. Something like `platforms/56b26b7b8a46c1c7695d41d1`. |

If access is to be allowed, the function should return a Promise that resolves to a truthy value, otherwise
to a falsy value. If the authorization request is malformed, for example because it uses a non-existent verb, then
the function should return a reject promise with an error object.

*Example:*

Here is function `simple`, a very simple implementation of the authorization function. It can be found
in the WeeRT repo in `server/services/auth.js`.

```Javascript
Promise = require('bluebird');

groups = {
    'admin': {'DELETE': true,  'POST': true, 'PUT': true, 'GET': true},
    'field': {'DELETE': false, 'POST': true, 'PUT': true, 'GET': true}
};

// Matches URLs of the form '/streams/:streamID/packets',
// where streamID is a hexadecimal number
re_packet = new RegExp('^/?streams/[0-9a-f]+/packets/?$');
// Matches URLs of the form '/platforms/:platformID/locations',
// where platformID is a hexadecimal number
re_location = new RegExp('^/?platforms/[0-9a-f]+/locations/?$');

var simple = function (usergroup, verb, endpoint) {

    return new Promise(function (resolve, reject) {

        // Everyone has 'GET' access
        if (verb === 'GET')
            return resolve(true);

        // The group 'datastream' can only post packets or locations
        if (usergroup === 'datastream') {
            if (verb === 'POST' && (re_packet.test(endpoint)) || re_location.test(endpoint))
                return resolve(true);
            else
                return resolve(false);
        }

        // Special groups, with explicit permission matrix
        if (usergroup in groups && verb in groups[usergroup]) {
            if (groups[usergroup][verb])
                return resolve(true);
            else
                return resolve(false);
        } else {
            return reject(new Error("Unknown usergroup or verb"))
        }
    });
};
```

In this version, everyone is allowed `GET` access to everything.

Usergroup `datastream`, which is presumably a feed from an instrument, can only post data or location packets.
Otherwise, access is denied. For example, it could post to the location stream

```
/platforms/56b26b7a8a46c1c7695d41b6/locations
```

but could not try to create a new platform by posting to

```
/platforms
```

Usergroup `admin` can do anything.

Usergroup `field` can do anything except use the verb `DELETE`.


### Setting the authorization function

Which authorization function to use is set by property `auth` in the configuration module `config/server.js`.
The default looks like this:

```Javascript
module.exports = {
    port: 3000,
    auth: require('../services/auth').insecure
};
```

The function `insecure` allows everything:

```Javascript
var insecure = function (usergroup, verb, endpoint) {
    return Promise.resolve(true);
};
```

The user is free to replace it with something else.