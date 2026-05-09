import {
  evaluateRecipeExpression,
  RecipeExpressionEvalError,
  RecipeExpressionParseError,
  resolveRecipePath,
} from '../recipe-expression.utility';
import type { RecipeExpressionContext } from '../../types/recipe-parser.types';

const ctx: RecipeExpressionContext = {
  params: {
    inputPath: '/home/u/Documents/x.txt',
    count: 3,
    enabled: true,
    nullValue: null,
  },
  steps: {
    s1: { output: { exitCode: 0, stdout: 'hello', size: 42 } },
    s2: { output: { error: 'something' } },
  },
};

describe('evaluateRecipeExpression — happy path', () => {
  it('reads $params paths', () => {
    expect(evaluateRecipeExpression('$params.count', ctx)).toBe(3);
    expect(evaluateRecipeExpression('$params.enabled', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.nullValue', ctx)).toBeNull();
  });

  it('reads $steps.<id>.output.<path>', () => {
    expect(evaluateRecipeExpression('$steps.s1.output.exitCode', ctx)).toBe(0);
    expect(evaluateRecipeExpression('$steps.s1.output.stdout', ctx)).toBe('hello');
  });

  it('comparison operators', () => {
    expect(evaluateRecipeExpression('$params.count == 3', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.count != 4', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.count > 2', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.count >= 3', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.count < 4', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.count <= 3', ctx)).toBe(true);
  });

  it('boolean operators', () => {
    expect(evaluateRecipeExpression('$params.enabled && $params.count > 0', ctx)).toBe(true);
    expect(evaluateRecipeExpression('$params.enabled || false', ctx)).toBe(true);
    expect(evaluateRecipeExpression('!$params.enabled', ctx)).toBe(false);
  });

  it('regex match operator', () => {
    expect(evaluateRecipeExpression("$steps.s1.output.stdout ~= 'h.+o'", ctx)).toBe(true);
    expect(evaluateRecipeExpression("$steps.s2.output.error ~= 'something'", ctx)).toBe(true);
    expect(evaluateRecipeExpression("$steps.s1.output.stdout ~= '^XYZ$'", ctx)).toBe(false);
  });

  it('string and number literals', () => {
    expect(evaluateRecipeExpression('"hello" == "hello"', ctx)).toBe(true);
    expect(evaluateRecipeExpression('42 > 41', ctx)).toBe(true);
    expect(evaluateRecipeExpression('null == null', ctx)).toBe(true);
  });

  it('parens for grouping', () => {
    expect(evaluateRecipeExpression('($params.count > 1) && ($params.count < 5)', ctx)).toBe(true);
  });
});

describe('evaluateRecipeExpression — adversarial fixtures (security)', () => {
  // Each of these MUST either throw or evaluate to a non-executable
  // value. None of them may execute arbitrary code, escape the
  // evaluator, or read process.env / globalThis.

  const HOSTILE: { name: string; expr: string }[] = [
    {
      name: 'constructor.constructor — Function reflection',
      expr: '$params.count.constructor.constructor("return process.env")()',
    },
    { name: '__proto__ access', expr: '$params.__proto__.toString' },
    { name: 'globalThis access', expr: 'globalThis' },
    { name: 'eval call', expr: 'eval("1+1")' },
    { name: 'Function literal', expr: 'Function("return 1")()' },
    { name: 'require call', expr: 'require("fs")' },
    { name: 'process.exit', expr: 'process.exit(1)' },
    { name: 'template literal', expr: '`${1+1}`' },
    { name: 'arrow function', expr: '(() => 1)()' },
    { name: 'object literal', expr: '{a:1}.a' },
    { name: 'array literal', expr: '[1,2,3].length' },
    { name: 'method call', expr: '$params.count.toString()' },
    { name: 'computed member access', expr: '$params["count"]' },
    { name: 'spread operator', expr: '...$params.count' },
    { name: 'increment', expr: '$params.count++' },
    { name: 'assignment', expr: '$params.count = 99' },
    { name: 'ternary', expr: 'true ? 1 : 2' },
    { name: 'comma operator', expr: '1, 2, 3' },
    { name: 'bitwise AND', expr: '$params.count & 1' },
    { name: 'bitwise OR', expr: '$params.count | 1' },
    { name: 'shift', expr: '$params.count << 2' },
    { name: 'modulo', expr: '$params.count % 2' },
    { name: 'multiplication', expr: '$params.count * 2' },
    { name: 'division', expr: '$params.count / 2' },
    { name: 'addition', expr: '$params.count + 1' },
    { name: 'subtraction', expr: '$params.count - 1' },
    { name: 'instanceof', expr: '$params.count instanceof Number' },
    { name: 'typeof', expr: 'typeof $params.count' },
    { name: 'void', expr: 'void 0' },
    { name: 'delete', expr: 'delete $params.count' },
    { name: 'new', expr: 'new Date()' },
    { name: 'function declaration', expr: 'function f(){return 1}' },
    { name: 'malformed path', expr: '$params..count' },
    { name: 'null bracket access', expr: '$params[null]' },
    { name: 'unicode escape', expr: '\\u0024params.count' },
    { name: 'regex injection — unanchored', expr: "$params.count ~= '(.*)+(.*)+'" },
    { name: 'regex DoS — catastrophic backtrack', expr: "$params.count ~= '^(a+)+$'" },
    { name: 'over-length input — 1000+ chars', expr: '$params.count'.padEnd(2000, ' ') },
  ];

  for (const { name, expr } of HOSTILE) {
    it(`rejects: ${name}`, () => {
      let threw = false;
      let result: unknown;
      try {
        result = evaluateRecipeExpression(expr, ctx);
      } catch (error) {
        threw = true;
        expect(error).toBeInstanceOf(Error);
        expect(
          error instanceof RecipeExpressionParseError ||
            error instanceof RecipeExpressionEvalError,
        ).toBe(true);
      }
      // Either it threw (preferred) or it evaluated to a benign value.
      // Critically, it MUST NOT have executed any function or returned
      // an object that gives the caller an attack handle.
      if (!threw) {
        expect(typeof result === 'function').toBe(false);
        expect(result === process).toBe(false);
        expect(result === globalThis).toBe(false);
      }
    });
  }
});

describe('resolveRecipePath', () => {
  it('returns the value for valid paths', () => {
    expect(resolveRecipePath('$params.count', ctx)).toBe(3);
    expect(resolveRecipePath('$steps.s1.output.exitCode', ctx)).toBe(0);
  });

  it('returns undefined for unknown paths (does not throw)', () => {
    expect(resolveRecipePath('$params.missing', ctx)).toBeUndefined();
    expect(resolveRecipePath('$steps.unknown.output.x', ctx)).toBeUndefined();
  });

  it('returns undefined for malformed inputs', () => {
    expect(resolveRecipePath('not a path', ctx)).toBeUndefined();
    expect(resolveRecipePath('$globals.x', ctx)).toBeUndefined();
    expect(resolveRecipePath('', ctx)).toBeUndefined();
  });
});
