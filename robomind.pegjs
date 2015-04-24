{
  var stdlib = options.stdlib || {};

  function genBinExpr(op, left, right, opType) {
    return {
      type: 'BinaryExpression',
      operator: {
        type: opType || op,
        raw: op
      },
      left: left,
      right: right
    };
  }

  function assertOneArgument(args, thingGettingArgs) {
    if (args.length !== 1) {
      error("Only one argument expected for the " + thingGettingArgs + ".");
    }
  }

  function assertNotInStdLib(id) {
    if (typeof stdlib[id] !== 'undefined') {
      error(stdlib[id] + " is part of the standard library. It can't be replaced with something else.");
    }
  }

  function callExpression(name, args, nativeName) {
    return {
      type: 'CallExpression',
      name: name,
      nativeName: stdlib[name] || nativeName || null,
      arguments: args || [],
      line: line(),
      column: column()
    };
  }

  function fakeCall(name) {
    return {
      type: 'CallStatement',
      expr: callExpression(name, null, name)
    };
  }

  function gatherArgs(first, rest) {
    var result = [];
    if (first) {
      result.push(first)
    }
    result.push.apply(result, rest);
    return result;
  }

  var breakOutsideLoop = false;
  function assertNoBreakOutsideLoop() {
    if (breakOutsideLoop) {
      error("Can't have a break command outside a loop.");
    }
  }

  function is(letters, keyword) {
    return stdlib[letters.toLowerCase()] === keyword;
  }
}

// 1 - SCRIPT FORMAT

Chars = c:[a-zA-Z_]+ {
  return c.join("");
};

Repeat "repeat" = c:Chars & { return is(c, "repeat"); }
RepeatWhile "repeatWhile" = c:Chars & { return is(c, "repeatWhile"); }

If "if" = c:Chars & { return is(c, "if"); }
Else "else" = c:Chars & { return is(c, "else"); }

Not "not" = c:Chars & { return is(c, "not"); } { return c; }
And "and" = c:Chars & { return is(c, "and"); } { return c; }
Or "or" = c:Chars & { return is(c, "or"); } { return c; }

Break "break" = c:Chars & { return is(c, "break"); } { return c; }
End "end" = c:Chars & { return is(c, "end"); } { return c; }

Procedure "procedure" = c:Chars & { return is(c, "procedure"); }

Reserved = Repeat / RepeatWhile / If / Else / Not / And / Or / Break / End / Procedure

Script
  = block:Block {
    assertNoBreakOutsideLoop();
    return {type: 'Script', body: block};
  }

Block
  = _ statements:Statement* { return statements; }

Statement
  = stmt:(Assignment / CallStmt / Loop / Conditional / ProcStmt / EndStmt / BreakStmt) _ { return stmt; }

CallStmt
  = call:CallExpr { return {type: 'CallStatement', expr: call}; }

CallExpr
  = id:Identifier _ args:Arguments? { return callExpression(id, args); }

Identifier "identifier"
  // The RoboMind language is case-insensitive. Use lower case
  // everywhere.
  = !Reserved chars:Chars { return chars.toLowerCase(); }

Arguments
  = "(" _ first:Expr? _ rest:("," _ v:Expr _ { return v; })* ")" {
    return gatherArgs(first, rest);
  }

Expr = MultiplicativeExpr

MultiplicativeExpr
  = left:AdditiveExpr _ op:("*" / "/") _ right:MultiplicativeExpr {
    return genBinExpr(op, left, right);
  }
  / AdditiveExpr

AdditiveExpr
  = left:LogicalExpr _ op:("+" / "-") _ right: AdditiveExpr {
    return genBinExpr(op, left, right);
  }
  / LogicalExpr

LogicalExpr
  = left:ComparisonExpr _ op:("&" / And) _ right:LogicalExpr {
    return genBinExpr(op, left, right, "and");
  }
  / left:ComparisonExpr _ op:("|" / Or) _ right:LogicalExpr {
    return genBinExpr(op, left, right, "or");
  }
  / ComparisonExpr

ComparisonExpr
  = left:PrimaryExpr _ op:("==" / "~=" / "<" / "<=" / ">" / ">=") _ right:ComparisonExpr {
    return genBinExpr(op, left, right);
  }
  / PrimaryExpr

PrimaryExpr
  = UnaryExpr
  / CallExpr
  / Literal
  / "(" _ e:Expr _ ")" { return e; }

UnaryExpr
  = op:UnaryOperator _ value:PrimaryExpr {
    return {
      type: 'UnaryExpression',
      operator: op,
      value: value
    };
  }

UnaryOperator
  = op:'-' { return {type: op, raw: op}; }
  / op:("~" / Not) { return {type: 'not', raw: op}; }

Literal
  = num:Number { return {type: 'Literal', value: num }; }

Number "number"
  = num:[0-9]+ {
    return parseInt(num.join(""), 10);
  }

Loop
  = l:(CountLoop / InfiniteLoop / WhileLoop) {
    breakOutsideLoop = false;

    return l;
  }

CountLoop
  = Repeat _ a:Arguments _ "{" b:Block "}" {
    assertOneArgument(a, "repeat loop");

    return {
      type: 'CountLoopStatement',
      count: a[0],
      body: b
    };
  }

InfiniteLoop
  = Repeat _ "{" b:Block "}" {
    return {
      type: 'InfiniteLoopStatement',
      body: b
    };
  }

WhileLoop
  = RepeatWhile _ a:Arguments _ "{" b:Block "}" {
    assertOneArgument(a, "repeatWhile loop");

    return {
      type: 'WhileLoopStatement',
      test: a[0],
      body: b
    };
  }

Conditional
  = If _ test:Arguments _ "{" then:Block "}" others:(ElseIfStmt+)? otherwise:ElseStmt? {
    assertOneArgument(test, "if statement");

    var result = {
      type: 'ConditionalStatement',
      otherwise: otherwise || [],
    };
    result.tests = [{
      test: test[0],
      then: then
    }].concat(others || []);
    return result;
  }

ElseIfStmt
  = _ Else _ If _ test:Arguments _ "{" then:Block "}" {
    assertOneArgument(test, "else if statement");

    return {
      test: test[0],
      then: then
    };
  }

ElseStmt
  = _ Else _ "{" b:Block "}" { return b; }

Assignment
  = id:Identifier _ "=" _ expr:Expr {
    assertNotInStdLib(id);

    return {
      type: 'AssignmentStatement',
      name: id,
      value: expr
    };
  }

ProcStmt
  = Procedure _ id:Identifier _ args:ProcArguments? _ "{" block:Block "}" {
    // It would make sense to call assertNotInStdLib(id) here. But
    // RoboMind doesn't do something like that, so we don't either.
    assertNoBreakOutsideLoop();

    return {
      type: 'ProcedureStatement',
      name: id,
      arguments: args || [],
      body: block
    };
  }

ProcArguments
  = "(" _ first:Identifier? _ rest:("," _ v:Identifier _ { return v; })* ")" {
    var args = gatherArgs(first, rest);
    args.forEach(assertNotInStdLib);
    return args;
  }

// The AST user can handle end/break as a call. The parser can't to stay
// compatible with RoboMind's errors.
EndStmt
  = e:End { return fakeCall(e); }

BreakStmt
  = b:Break { breakOutsideLoop = true; return fakeCall(b); }

Ws "whitespace" = [ \t\r\n]+

Comment "comment" = "#" (! "\n" .)*

_ = (Ws / Comment)*

// 2 - MAP FORMAT

Map
  = sections:Section+ {
    var result = {type: 'map'};
    sections.forEach(function (section) {
      if (typeof result[section.name] === 'undefined') {
        result[section.name] = section.data;
      }
    });
    return result;
  }

Section
  = _ s:(Paint / Extra / MapStructure) _ {
    return s;
  }

Paint
  = "paint:" _ "{"? _ p:PaintItem* _ "}"? {
    return {
      name: 'paint',
      data: p
    };
  }

PaintItem
  = "(" _ c:Color _ "," _ t:Type _ "," _ x:MapNum _ "," _ y:MapNum _ ")" _ (!PaintItem !Section .)* _ {
    return {
      color: c,
      type: t,
      x: x,
      y: y
    };
  }

MapNum
  = Number
  / "-" _ num:Number { return -num; }

Color
  = "w" { return 'white'; }
  / "b" { return 'black'; }

Type
  = "." { return 'dot'; }
  / "-" { return 'right'; }
  / "|" { return 'down'; }

Extra
  = "extra:" _ e:ExtraItem* {
    return {
      name: 'extra',
      data: e
    };
  }

ExtraItem
  = id:Identifier "@" x:MapNum "," y:MapNum _ {
    return {
      name: id,
      x: x,
      y: y
    };
  }

MapStructure
  = "map:" ((!Newline _)? Newline)+ m:MapRow* {
    return {
      name: 'map',
      data: m.filter(function (x) { return x; })
    };
  }

Newline = "\r\n" / "\n"

MapRow
  = row:[A-Z@* ]+ (Newline / EOF) { return row.join("").replace(/ +$/, ""); }

EOF = !.
