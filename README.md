robomind-parser
===============

[![Build Status](https://travis-ci.org/marten-de-vries/robomind-parser.svg?branch=master)](https://travis-ci.org/marten-de-vries/robomind-parser)
[![Dependency Status](https://david-dm.org/marten-de-vries/robomind-parser.svg)](https://david-dm.org/marten-de-vries/robomind-parser)
[![devDependency Status](https://david-dm.org/marten-de-vries/robomind-parser/dev-status.svg)](https://david-dm.org/marten-de-vries/robomind-parser#info=devDependencies)

Parses a RoboMind .irobo and/or .map file into an AST, which can be
interpreted using
[robomind-interpreter](https://www.npmjs.com/package/robomind-interpreter).

robomind-parser uses [PEG.js](http://pegjs.org/) internally, and has
been tested reasonably well. It supports translation of keywords into
multiple languages, like RoboMind.

robomind-parser was written for use in 
[SkidBot](https://github.com/marten-de-vries/skidbot).

Example
-------

``$ ./bin/robomind-parser test.irobo``

API
---

```javascript
var parser = require('robomind-parser');
```

- ``parser.languages``
  An array containing all the language codes of languages
  robomind-parser supports.
- ``parser.info(type, lang)``
  Provides information about the grammar of the RoboMind language.
  - ``type`` should be one of 'keywords', 'atoms', 'variables'.
  - ``lang`` should be one of the values of ``parser.languages``, 
- ``parser.parseScript(code, opts)``
  Parses ``code`` and returns an ast. ``opts`` can be
  - ``language``: is 'en' by default. You can change this to parse
    keywords in another language
  - any peg.js options to pass to the parser (startRule excluded)
- ``parser.parseScriptFile(path[, opts], cb)``
  The same as above, but now taking a path instead of code, and using a
  callback function to provide the result since this requires IO.
- ``parser.parseMap(code)``
  See above.
- ``parser.parseMapFile(path, cb)``
  See above.
- ``parser.SyntaxError``
  The SyntaxError function this parser uses. Handy for instanceof checks
  in error handlers.

Contributing
------------

You don't need to be able to code to contribute, everyone can help with
translations. Do make sure that the translations are the same as the one
RoboMind uses, otherwise it becomes impossible to load its files.

You can translate robomind-parser
[on the online Launchpad](https://translations.launchpad.net/robomind-parser)
site.

If you do want to work on the code, these are useful commands to know:

- ``npm install`` - needs to be run only once.
- ``npm test`` - to rebuild, run the test suite, and collect coverage
  information.
- ``npm run build`` - to just rebuild.

TODOS
-----

- more translations
- more tests
