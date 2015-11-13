# Test of WeeRT RESTful services

This test suite uses the utility [Frisby](http://frisbyjs.com), which, in turn, requires the
[Jasmine](https://www.npmjs.com/package/jasmine-node) V1.x test framework. Jasmine has since
moved on to V2.x, but, fortunately, if you use NPM to install Jasmine on node, it is still on V1.3.

The following assumes that you've already installed WeeRT.

Then download and install the Node version of Jasmine:

```Shell
npm install jasmine-node -g
```

Then, start the WeeRT server. It will monitor port `http://localhost:3000`

Then run the test suite from the main directory

```
make test
```

The documentation for Frisby is pretty poor.
[Better documentation](https://ptmccarthy.github.io/2014/06/28/rest-testing-with-frisby/).