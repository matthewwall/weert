# Test of WeeRT RESTful services

This test suite uses the utility [Frisby](http://frisbyjs.com), which, in turn, requires the
[Jasmine](https://www.npmjs.com/package/jasmine-node) V1.x test framework. Jasmine has since moved
on to a Version 2.x, which I don't think will work with Frisby. Fortunately, as of this writing
(November, 2015), the NPM version of Frisby is still at V1.14, so if you install Jasmine using NPM, it will work.

Start by downloading and installing Jasmine.

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