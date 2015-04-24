"use strict";

var parser = require('./parser');

var fileSupport = true;
try {
  var iconv = require('iconv-lite');
  var fs = require('fs');
} catch (err) {
  /* istanbul ignore next */
  fileSupport = false;
}

var stdlibs = {
  en: require('./translations/gen/en'),
  nl: require('./translations/gen/nl')
};

exports.languages = Object.keys(stdlibs).sort();

exports.info = function (type, lang) {
  var stdlib = stdlibs[lang || 'en'];
  var keywords = 'procedure repeat repeatWhile if else return end break'.split(' ');
  var atoms = 'true false'.split(' ');

  return {
    keywords: lookup.bind(null, stdlib, keywords),
    atoms: lookup.bind(null, stdlib, atoms),
    variables: function () {
      return lookup(stdlib, Object.keys(stdlib).filter(function (word) {
        return keywords.indexOf(word) === -1 && atoms.indexOf(word) === -1;
      }));
    }
  }[type]();
};

function lookup(stdlib, words) {
  return words.map(function (word) {
    return stdlib[word];
  });
}

exports.parseScript = function (code, opts) {
  if (!opts) {
    opts = {};
  }
  opts.startRule = 'Script';
  opts.stdlib = {};
  var words = stdlibs[opts.language || 'en'];
  Object.keys(words).forEach(function (key) {
    opts.stdlib[words[key].toLowerCase()] = key;
  });
  return parser.parse(code, opts);
};

exports.parseScriptFile = function (path, opts, cb) {
  parseFile(path, exports.parseScript, 'utf16', opts, cb);
};

function parseFile(path, parse, encoding, opts, cb) {
  /* istanbul ignore if */
  if (!fileSupport) {
    throw new Error("The file parser functions are unavailable.");
  }
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  fs.readFile(path, function (err, resp) {
    if (err) {
        return cb(err);
    }
    try {
      cb(null, parse(iconv.decode(resp, encoding)));
    } catch (err) {
      cb(err);
    }
  });
}

exports.parseMap = function (code) {
  return parser.parse(code, {startRule: 'Map'});
};

exports.parseMapFile = function (path, cb) {
  parseFile(path, exports.parseMap, 'ascii', cb);
};

exports.SyntaxError = parser.SyntaxError;
