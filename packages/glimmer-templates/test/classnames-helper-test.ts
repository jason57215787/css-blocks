import {
  Syntax,
  builders,
  print,
  AST,
} from '@glimmer/syntax';
import classnamesHelper from '../src/helpers/classnames';
import { classnamesHelper as helperGenerator } from "../src/ClassnamesHelperGenerator";
import path = require('path');
import { expect } from 'chai';
import { fixture } from "./fixtures";
import {
  IndexedClassRewrite, BlockObject, BooleanExpression, AndExpression, OrExpression, NotExpression, ElementAnalysis, Block,
  IndexedClassMapping,
} from "css-blocks";
import {
  BooleanExpression as BooleanAST,
  StringExpression as StringAST,
  TernaryExpression as TernaryAST,
} from "../src/ElementAnalyzer";
import {
  POSITION_UNKNOWN
} from "@opticss/template-api";
import {
  assertNever,
} from "@opticss/util";
import { inspect } from "util";

function run(ast: AST.MustacheStatement, helper?: (name: string, params: any[]) => any) {
  let args = ast.params.map(p => astToLiterals(p, helper));
  return classnamesHelper(args);
}

function astToLiterals(node: AST.Expression, helper?: (name: string, params: any[]) => any): any {
  switch(node.type) {
    case "SubExpression":
      if (helper) return helper(node.path.original, node.params.map(p => astToLiterals(p, helper)));
      throw new Error(`not handled ${inspect(node)}`);
    case "StringLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "NumberLiteral":
      return node.value;
    case "UndefinedLiteral":
      return undefined;
    case "NullLiteral":
      return null;
    case "PathExpression":
      throw new Error(`not handled ${inspect(node)}`);
    default:
      return assertNever(node);
  }
}

describe('Classnames Helper', () => {
  it('generates an ast fragment for a dynamic class name expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 1 0 0 true 2 0 2 1 1}}"
    );
  });
  it('generates an ast fragment for a dependent style expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b],
    });
    element.addStaticState(b, s1);
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 2 0 0 true 1 0 0 1 1 0 1 3}}"
    );
  });
  it('generates an ast fragment for a dependent style expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b],
    });
    element.addDynamicState(b, s1, builders.boolean(false));
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 2 0 0 true 1 0 0 3 1 0 false 1 3}}"
    );
  });

  it('generates an ast fragment for a state group', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.string("blue")));
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 0 4 3 1 "blue" "red" 1 1 "orange" 1 2 "blue" 1 3}}'
    );
  });

  it('generates an ast fragment for a dependent state group', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.path("/app/foo/helperz"), [builders.string("blue")]));
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 2 0 0 true 1 0 0 5 1 0 3 1 (/app/foo/helperz "blue") "red" 1 1 "orange" 1 2 "blue" 1 3}}'
    );
  });
  it('generates an ast fragment for optimized classes', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0, 2 ]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 2}}'
    );
  });
  it('omits the boolean expression for single "and" and "or" values', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ {or: [0]}, {and: [2]} ]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 2}}'
    );
  });
  it('can negate boolean expressions', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [0, {not: 2}]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 -1 2}}'
    );
  });
  it('can "or" boolean expressions', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {or: [0, {not: 2}]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -2 2 0 -1 2}}'
    );
  });
  it('can run the generated helper expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 1 4 0 true 2 0 2 1 1 "a" 0 "b" 1 "c" 2 "d" 3}}');
    expect(run(ast)).deep.equals('a c');
  });
  it('false ternary picks the other branch', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(false),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    element.seal();
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 1 4 0 false 2 0 2 1 1 "a" 0 "b" 1 "c" 2 "d" 3}}');
    expect(run(ast)).deep.equals('b');
  });
  it('dependent state group is allowed when class is set', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.string("blue")));
    element.seal();
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 2 4 0 true 1 0 0 5 1 0 3 1 "blue" "red" 1 1 "orange" 1 2 "blue" 1 3 "a" 0 "b" 1 "c" 2 "d" 3}}'
    );
    expect(run(ast)).deep.equals('a d');
  });
  it('dependent state group is disabled when class is not set', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(false),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.string("blue")));
    element.seal();
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 2 4 0 false 1 0 0 5 1 0 3 1 "blue" "red" 1 1 "orange" 1 2 "blue" 1 3 "a" 0 "b" 1 "c" 2 "d" 3}}'
    );
    expect(run(ast)).deep.equals('');
  });
  it('dependent state group is unset when falsy', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.undefined()));
    element.seal();
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 2 4 0 true 1 0 0 5 1 0 3 1 undefined "red" 1 1 "orange" 1 2 "blue" 1 3 "a" 0 "b" 1 "c" 2 "d" 3}}'
    );
    expect(run(ast)).deep.equals('a');
  });
  it('dependent state group errors when falsy', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.undefined()), true);
    element.seal();
    expect(() => {
      run(helperGenerator(rewrite, element));
    }).throws("string expected");
  });

  it('handles complex boolean expressions', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let c3 = b.ensureClass("class-3");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicClasses({
      condition: builders.boolean(false),
      whenTrue: [ c1 ]
    });
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ c2 ]
    });
    element.addDynamicClasses({
      condition: builders.boolean(false),
      whenTrue: [ c3 ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.string("blue")));
    element.seal();
    let inputs = [b, red, orange, blue, c1, c2, c3];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0 ]},
      b: {and: [ 1 ]},
      c: {and: [ 2 ]},
      d: {and: [ 3 ]},
      e: {or: [ 2, 5 ]},
      f: {or: [ 2, {not: {not: {and: [0, 5] } } } ] },
    });
    let ast = helperGenerator(rewrite, element);
    expect(print(ast)).deep.equals(
      '{{/css-blocks/components/classnames 5 6 0 true 1 0 0 0 false 1 4 0 0 true 1 5 0 0 false 1 6 0 5 1 0 3 1 "blue" "red" 1 1 "orange" 1 2 "blue" 1 3 "a" 0 "b" 1 "c" 2 "d" 3 "e" -2 2 2 5 "f" -2 2 2 -1 -1 -3 2 0 5}}'
    );
    expect(run(ast)).deep.equals('a d e f');
  });
});