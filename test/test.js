/* globals describe, it */

"use strict";

var parser = require('..');
var main = require('../bin/robomind-parser');

var should = require('chai').should();

describe("script parser", function () {
  describe("basics", function () {
    it("shouldn't parse keywords as id", function () {
      (function () {
	parser.parseScript('if');
      }).should.throw(parser.SyntaxError);
    });

    it("should parse an empty file", function () {
      var a = parser.parseScript('');
      var b = parser.parseScript('\n');
      var c = parser.parseScript(' ');
      a.should.eql({
	type: 'Script',
	body: []
      });
      a.should.eql(b);
      a.should.eql(c);
    });

    it("should ignore a comment", function () {
      parser.parseScript('#test\nforward').should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'CallStatement',
	    expr: {
	      type: 'CallExpression',
	      arguments: [],
	      name: 'forward',
	      nativeName: 'forward',
	      line: 2,
	      column: 1
	    }
	  }
	]
      });
    });
  });

  describe("procedure call", function () {
    it("should parse a procedure call without args", function () {
      var a = parser.parseScript('a');
      var b = parser.parseScript('a()');
      var c = parser.parseScript('a( )');

      a.should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'CallStatement',
	    expr: {
	      type: 'CallExpression',
	      name: "a",
	      nativeName: null,
	      arguments: [],
	      column: 1,
	      line: 1
	    }
	  }
	]
      });
      a.should.eql(b);
      a.should.eql(c);
    });

    it("should parse a procedure call with args", function () {
      var a = parser.parseScript('a(b,c)');
      var b = parser.parseScript('a( b, c)');
      var c = parser.parseScript('a (\nb,\n c\n)#comment');

      a.should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'CallStatement',
	    expr: {
	      type: 'CallExpression',
	      name: "a",
	      column: 1,
	      line: 1,
	      nativeName: null,
	      arguments: [
		{
		  type: 'CallExpression',
		  name: "b",
		  nativeName: null,
		  arguments: [],
		  column: 3,
		  line: 1
		},
		{
		  type: 'CallExpression',
		  name: "c",
		  nativeName: null,
		  arguments: [],
		  column: 5,
		  line: 1
		}
	      ]
	    }
	  }
	]
      });
      // change line numbers
      a.body[0].expr.arguments[0].column = 4;
      a.body[0].expr.arguments[1].column = 7;
      a.should.eql(b);
      // change line numbers
      a.body[0].expr.arguments[0].column = 1;
      a.body[0].expr.arguments[0].line = 2;
      a.body[0].expr.arguments[1].column = 2;
      a.body[0].expr.arguments[1].line = 3;
      a.should.eql(c);
    });
  });

  describe("assignment", function () {
    it("should parse a basic one", function () {
      var a = parser.parseScript('a = 3');
      a.should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'AssignmentStatement',
	    name: 'a',
	    value: {
	      type: 'Literal',
	      value: 3
	    }
	  }
	]
      });
    });

    it("should parse a complex one", function () {
      var a = parser.parseScript('a = 3 + 2');
      a.should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'AssignmentStatement',
	    name: 'a',
	    value: {
	      type: 'BinaryExpression',
	      left: {
		type: 'Literal',
		value: 3
	      },
	      right: {
		type: 'Literal',
		value: 2
	      },
	      operator: {
		raw: "+",
		type: '+'
	      }
	    }
	  }
	]
      });
    });

    it("shouldn't allow overwriting stdlib functions", function () {
      (function () {
	parser.parseScript('frontIsClear = 2');
      }).should.throw(parser.SyntaxError);
    });
  });

  describe("loop", function () {
    it("shouldn't allow a break command outside a loop", function () {
      (function () {
	parser.parseScript('break');
      }).should.throw(parser.SyntaxError);
    });

    it("should allow a break command inside a loop", function () {
      parser.parseScript('repeat {break}').should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'InfiniteLoopStatement',
	    body: [
	      {
		type: 'CallStatement',
		expr: {
		  type: 'CallExpression',
		  name: "break",
		  nativeName: 'break',
		  arguments: [],
		  line: 1,
		  column: 9
		}
	      }
	    ]
	  }
	]
      });
    });

    it("shouldn't allow more than one argument in a count loop", function () {
      (function () {
	parser.parseScript('repeat(1, 2) {}');
      }).should.throw(parser.SyntaxError);
    });

    it("should allow a loop inside a loop", function () {
      parser.parseScript('repeatWhile(true) {repeat(2) {}}').should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'WhileLoopStatement',
	    test: {
	      type: 'CallExpression',
	      name: "true",
	      nativeName: 'true',
	      arguments: [],
	      line: 1,
	      column: 13
	    },
	    body: [
	      {
		type: 'CountLoopStatement',
		count: {
		  type: 'Literal',
		  value: 2
		},
		body: []
	      }
	    ]
	  }
	]
      });
    });
    it("should parse and infinite one", function () {
      var a = parser.parseScript('repeat {a = 3}');
      a.should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'InfiniteLoopStatement',
	    body: [
	      {
		type: 'AssignmentStatement',
		name: 'a',
		value: {
		  type: 'Literal',
		  value: 3
		}
	      }
	    ]
	  }
	]
      });
    });
  });

  describe("conditional", function () {
    it("should parse a composited one", function () {
      parser.parseScript("if (not (-1 | 0) and 2) {end}").should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'ConditionalStatement',
	    tests: [
	      {
		test: {
		  type: 'BinaryExpression',
		  operator: {
		    type: 'and',
		    raw: 'and'
		  },
		  left: {
		    type: 'UnaryExpression',
		    operator: {
		      type: 'not',
		      raw: 'not'
		    },
		    value: {
		      type: 'BinaryExpression',
		      operator: {
			type: 'or',
			raw: '|'
		      },
		      left: {
			type: 'UnaryExpression',
			operator: {
			  type: '-',
			  raw: '-'
			},
			value: {
			  type: 'Literal',
			  value: 1
			}
		      },
		      right: {
			type: 'Literal',
			value: 0
		      }
		    }
		  },
		  right: {
		    type: 'Literal',
		    value: 2
		  }
		},
		then: [
		  {
		    type: 'CallStatement',
		    expr: {
		      type: 'CallExpression',
		      name: "end",
		      nativeName: 'end',
		      arguments: [],
		      line: 1,
		      column: 26
		    }
		  }
		]
	      }
	    ],
	    otherwise: []
	  }
	]
      });
    });
    it("should parse a complete one", function () {
      var assignment = {
	type: 'AssignmentStatement',
	name: 'a',
	value: {
	  type: 'Literal',
	  value: 3
	}
      };
      parser.parseScript("if (0) {a = 3} else if (1) {a = 3} else {a = 3}").should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'ConditionalStatement',
	    otherwise: [assignment],
	    tests: [
	      {
		test: {
		  type: 'Literal',
		  value: 0
		},
		then: [assignment]
	      },
	      {
		test: {
		  type: 'Literal',
		  value: 1
		},
		then: [assignment]
	      }
	    ]
	  }
	]
      });
    });
  });

  describe("procedure definition", function () {
    it("should work without arguments", function () {
      parser.parseScript("procedure do_nothing {}").should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'ProcedureStatement',
	    name: 'do_nothing',
	    arguments: [],
	    body: [],
	  }
	]
      });
    });
  });

  describe("translations", function () {
    it("should parse a non-ascii script", function () {
      parser.parseScript('foarút', {language: 'fy'}).should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'CallStatement',
	    expr: {
	      type: 'CallExpression',
	      name: 'foarút',
	      nativeName: 'forward',
	      arguments: [],
	      line: 1,
	      column: 1
	    }
	  }
	]
      });
    });
    it("should parse a foreign language break statement", function () {
      parser.parseScript('werhelje { kapjeOf }', {language: 'fy'}).should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'InfiniteLoopStatement',
	    body: [
	      {
		type: 'CallStatement',
		expr: {
		  type: 'CallExpression',
		  name: 'kapjeOf',
		  nativeName: 'break',
		  arguments: [],
		  line: 1,
		  column: 12
		}
	      }
	    ]
	  }
	]
      });
    });
    it("should parse a Dutch script", function () {
      parser.parseScript("herhaal {noord(waar)}", {language: 'nl'}).should.eql({
	type: 'Script',
	body: [
	  {
	    type: 'InfiniteLoopStatement',
	    body: [
	      {
		type: 'CallStatement',
		expr: {
		  type: 'CallExpression',
		  name: 'noord',
		  nativeName: 'north',
		  arguments: [
		    {
		      type: 'CallExpression',
		      name: 'waar',
		      nativeName: 'true',
		      arguments: [],
		      line: 1,
		      column: 16
		    }
		  ],
		  line: 1,
		  column: 10
		}
	      }
	    ]
	  }
	]
      });
    });
  });
});

describe("get parser info", function () {
  it("should list all supported languages", function () {
    parser.languages.should.eql(['en', 'fy', 'nl']);
  });
  it("should return keywords", function () {
    var info = parser.info('keywords', 'en');
    info.should.contain('repeat');
    info.should.contain('end');
    info.should.not.contain('forward');
  });
  it("should return atoms", function () {
    var info = parser.info('atoms', 'nl');
    info.should.eql(['waar', 'onwaar']);
  });
  it("should return variables", function () {
    var info = parser.info('variables');
    info.should.contain('forward');
    info.should.contain('flipCoin');
    info.should.not.contain('if');
  });
});

describe("map parser", function () {
  it("should pass a basic test", function () {
    parser.parseMap("map:\nAA\n B\nextra:\ntree@0,0\npaint:\n(w,.,4,1)").should.eql({
      type: 'map',
      map: ['AA', ' B'],
      extra: [
	{
	  name: 'tree',
	  x: 0,
	  y: 0
	}
      ],
      paint: [
	{
	  color: 'white',
	  type: 'dot',
	  x: 4,
	  y: 1
	}
      ]
    });
  });
});

describe("file tests", function () {
  it("shouldn't parse this JS file", function (done) {
    parser.parseScriptFile(__filename, {}, function (err, resp) {
      err.should.be.an.instanceof(parser.SyntaxError);
      done();
    });
  });
  it("should fail with an unexisting file", function (done) {
    parser.parseMapFile("flksjdflksdjfklsjdf", function (err, resp) {
      should.exist(err);
      done();
    });
  });

  it('should parse three files', function (cb) {
   process.argv[2] = __dirname + '/files/question1.irobo';
    main(function (err, resp) {
      if (err) {
	return cb(err);
      }
      JSON.parse(resp);

      process.argv[2] = __dirname + '/files/question2.irobo';
      main(function (err, resp) {
	if (err) {
	  return cb(err);
	}
	JSON.parse(resp);

	process.argv[2] = __dirname + '/files/test.map';
	main(function (err, resp) {
	  if (err) {
	    return cb(err);
	  }
	  JSON.parse(resp);
	  cb();
	});
      });
    });
  });
});
