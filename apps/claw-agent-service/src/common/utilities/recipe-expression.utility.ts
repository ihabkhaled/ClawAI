/**
 * Safe recipe-expression evaluator (Stream 13).
 *
 * Hard rules:
 *  - This is NOT eval. NOT vm. NOT new Function(). It is a tiny
 *    handwritten parser + evaluator that ONLY supports:
 *      • path access  $params.<name>           → read recipe parameter
 *      • path access  $steps.<id>.output[.<path>] → read previous step output
 *      • literals     "string"  'string'  123  true  false  null
 *      • comparison   == != === !== > >= < <=
 *      • boolean ops  && || !
 *      • string match ~= "regex"
 *  - No function calls. No member-of-Object literal. No template strings.
 *    No bracket-access in input strings (only via path nodes).
 *  - All inputs come from a Zod-validated DSL string ≤ 500 chars.
 *
 * Tested with 30+ injection vectors (constructor.constructor("…")(),
 * polluted prototypes, base64-encoded payloads). Any token outside the
 * grammar throws RecipeExpressionParseError.
 */

import { Logger } from '@nestjs/common';

import { RECIPE_PATH_REGEX } from '../constants/recipe.constants';
import type {
  RecipeParserCursor as Cursor,
  RecipeExpressionContext,
  RecipeToken as Token,
} from '../types/recipe-parser.types';

export type { RecipeExpressionContext } from '../types/recipe-parser.types';

const logger = new Logger('RecipeExpressionUtility');

export class RecipeExpressionParseError extends Error {}
export class RecipeExpressionEvalError extends Error {}

/**
 * Tokeniser — purposely strict; anything unexpected throws.
 */
function tokenise(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src.at(i);
    if (c === undefined) {
      break;
    }
    if (c === ' ' || c === '\t' || c === '\n') {
      i += 1;
      continue;
    }
    if (c === '(' || c === ')') {
      tokens.push({ kind: 'PAREN', value: c });
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      if (end === -1) {
        throw new RecipeExpressionParseError(`Unterminated string starting at ${String(i)}`);
      }
      tokens.push({ kind: 'STRING', value: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (c === '$') {
      const match = src.slice(i).match(RECIPE_PATH_REGEX);
      if (match === null) {
        throw new RecipeExpressionParseError(`Bad path token at ${String(i)}`);
      }
      const segments = match[0].slice(1).split('.');
      tokens.push({ kind: 'PATH', segments });
      i += match[0].length;
      continue;
    }
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < src.length) {
        const ch = src.at(j);
        if (ch === undefined) {
          break;
        }
        if (!((ch >= '0' && ch <= '9') || ch === '.')) {
          break;
        }
        j += 1;
      }
      const num = Number(src.slice(i, j));
      if (Number.isNaN(num)) {
        throw new RecipeExpressionParseError(`Bad number at ${String(i)}`);
      }
      tokens.push({ kind: 'NUMBER', value: num });
      i = j;
      continue;
    }
    if (src.startsWith('true', i)) {
      tokens.push({ kind: 'BOOLEAN', value: true });
      i += 4;
      continue;
    }
    if (src.startsWith('false', i)) {
      tokens.push({ kind: 'BOOLEAN', value: false });
      i += 5;
      continue;
    }
    if (src.startsWith('null', i)) {
      tokens.push({ kind: 'NULL' });
      i += 4;
      continue;
    }
    if (src.startsWith('===', i)) {
      tokens.push({ kind: 'OPERATOR', op: '===' });
      i += 3;
      continue;
    }
    if (src.startsWith('!==', i)) {
      tokens.push({ kind: 'OPERATOR', op: '!==' });
      i += 3;
      continue;
    }
    if (src.startsWith('==', i)) {
      tokens.push({ kind: 'OPERATOR', op: '==' });
      i += 2;
      continue;
    }
    if (src.startsWith('!=', i)) {
      tokens.push({ kind: 'OPERATOR', op: '!=' });
      i += 2;
      continue;
    }
    if (src.startsWith('>=', i)) {
      tokens.push({ kind: 'OPERATOR', op: '>=' });
      i += 2;
      continue;
    }
    if (src.startsWith('<=', i)) {
      tokens.push({ kind: 'OPERATOR', op: '<=' });
      i += 2;
      continue;
    }
    if (c === '>' || c === '<') {
      tokens.push({ kind: 'OPERATOR', op: c });
      i += 1;
      continue;
    }
    if (src.startsWith('&&', i)) {
      tokens.push({ kind: 'OPERATOR', op: '&&' });
      i += 2;
      continue;
    }
    if (src.startsWith('||', i)) {
      tokens.push({ kind: 'OPERATOR', op: '||' });
      i += 2;
      continue;
    }
    if (c === '!') {
      tokens.push({ kind: 'OPERATOR', op: '!' });
      i += 1;
      continue;
    }
    if (src.startsWith('~=', i)) {
      tokens.push({ kind: 'OPERATOR', op: '~=' });
      i += 2;
      continue;
    }
    throw new RecipeExpressionParseError(`Unexpected character '${c}' at ${String(i)}`);
  }
  return tokens;
}

/**
 * Path resolver — walks the segments through the context. Returns
 * undefined if any segment misses; never throws.
 */
function resolvePath(segments: string[], ctx: RecipeExpressionContext): unknown {
  if (segments.length === 0) {
    return undefined;
  }
  const root = segments[0] === 'params' ? ctx.params : ctx.steps;
  let cursor: unknown = root;
  for (let s = 1; s < segments.length; s += 1) {
    const segment = segments.at(s);
    if (segment === undefined) {
      return undefined;
    }
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    // Block prototype-chain walks. Path resolution must only see own
    // enumerable properties of the explicit context, not inherited
    // members like __proto__, constructor, prototype, hasOwnProperty.
    if (
      segment === '__proto__' ||
      segment === 'constructor' ||
      segment === 'prototype' ||
      !Object.prototype.hasOwnProperty.call(cursor, segment)
    ) {
      return undefined;
    }
    const entry = Object.entries(cursor as Record<string, unknown>).find(([k]) => k === segment);
    cursor = entry?.[1];
  }
  return cursor;
}

/**
 * Tiny recursive-descent evaluator. Operator precedence:
 *  ! (highest, unary)
 *  > >= < <=
 *  == != === !== ~=
 *  &&
 *  || (lowest)
 */
function nextToken(c: Cursor): Token | undefined {
  return c.tokens[c.i];
}

function consume(c: Cursor): Token {
  const t = c.tokens[c.i];
  if (t === undefined) {
    throw new RecipeExpressionParseError('Unexpected end of expression');
  }
  c.i += 1;
  return t;
}

function evalUnary(c: Cursor, ctx: RecipeExpressionContext): unknown {
  const t = nextToken(c);
  if (t === undefined) {
    throw new RecipeExpressionParseError('Unexpected end of expression');
  }
  if (t.kind === 'OPERATOR' && t.op === '!') {
    consume(c);
    const inner = evalUnary(c, ctx);
    return !inner;
  }
  if (t.kind === 'PAREN' && t.value === '(') {
    consume(c);
    const value = evalOr(c, ctx);
    const close = consume(c);
    if (close?.kind !== 'PAREN' || close.value !== ')') {
      throw new RecipeExpressionParseError('Missing closing paren');
    }
    return value;
  }
  consume(c);
  if (t.kind === 'STRING') {
    return t.value;
  }
  if (t.kind === 'NUMBER') {
    return t.value;
  }
  if (t.kind === 'BOOLEAN') {
    return t.value;
  }
  if (t.kind === 'NULL') {
    return null;
  }
  if (t.kind === 'PATH') {
    return resolvePath(t.segments, ctx);
  }
  throw new RecipeExpressionParseError(`Unexpected token ${t.kind}`);
}

function evalCompare(c: Cursor, ctx: RecipeExpressionContext): unknown {
  let left = evalUnary(c, ctx);
  while (true) {
    const t = nextToken(c);
    if (t?.kind !== 'OPERATOR') {
      return left;
    }
    if (t.op !== '>' && t.op !== '>=' && t.op !== '<' && t.op !== '<=') {
      return left;
    }
    consume(c);
    const right = evalUnary(c, ctx);
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new RecipeExpressionEvalError(`Comparison ${t.op} requires numbers`);
    }
    if (t.op === '>') {
      left = left > right;
    } else if (t.op === '>=') {
      left = left >= right;
    } else if (t.op === '<') {
      left = left < right;
    } else {
      left = left <= right;
    }
  }
}

function evalEquality(c: Cursor, ctx: RecipeExpressionContext): unknown {
  let left = evalCompare(c, ctx);
  while (true) {
    const t = nextToken(c);
    if (t?.kind !== 'OPERATOR') {
      return left;
    }
    if (t.op !== '==' && t.op !== '!=' && t.op !== '===' && t.op !== '!==' && t.op !== '~=') {
      return left;
    }
    consume(c);
    const right = evalCompare(c, ctx);
    if (t.op === '==' || t.op === '===') {
      left = left === right;
    } else if (t.op === '!=' || t.op === '!==') {
      left = left !== right;
    } else if (t.op === '~=') {
      if (typeof left !== 'string' || typeof right !== 'string') {
        throw new RecipeExpressionEvalError('~= requires both sides string');
      }
      try {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const re = new RegExp(right);
        left = re.test(left);
      } catch {
        throw new RecipeExpressionEvalError('Invalid regex on right side of ~=');
      }
    }
  }
}

function evalAnd(c: Cursor, ctx: RecipeExpressionContext): unknown {
  let left = evalEquality(c, ctx);
  while (true) {
    const t = nextToken(c);
    if (t?.kind !== 'OPERATOR' || t.op !== '&&') {
      return left;
    }
    consume(c);
    const right = evalEquality(c, ctx);
    left = Boolean(left) && Boolean(right);
  }
}

function evalOr(c: Cursor, ctx: RecipeExpressionContext): unknown {
  let left = evalAnd(c, ctx);
  while (true) {
    const t = nextToken(c);
    if (t?.kind !== 'OPERATOR' || t.op !== '||') {
      return left;
    }
    consume(c);
    const right = evalAnd(c, ctx);
    left = Boolean(left) || Boolean(right);
  }
}

/**
 * Evaluate a recipe expression. Returns the resolved value (any
 * primitive). Throws RecipeExpressionParseError or
 * RecipeExpressionEvalError on bad input.
 */
export function evaluateRecipeExpression(
  source: string,
  context: RecipeExpressionContext,
): unknown {
  if (source.length > 500) {
    throw new RecipeExpressionParseError('Expression exceeds 500-char cap');
  }
  const tokens = tokenise(source);
  const cursor: Cursor = { i: 0, tokens };
  const value = evalOr(cursor, context);
  if (cursor.i !== tokens.length) {
    logger.warn(`Trailing tokens after expression at ${String(cursor.i)}`);
    throw new RecipeExpressionParseError('Trailing tokens after expression');
  }
  return value;
}

/**
 * Resolve a single path-only string ($params.x or $steps.id.output.path).
 * Used by recipe runner to interpolate target/payload field values.
 * Returns undefined for unknown paths (never throws).
 */
export function resolveRecipePath(source: string, context: RecipeExpressionContext): unknown {
  const trimmed = source.trim();
  const match = trimmed.match(
    /^\$(params|steps)\.[a-zA-Z_][a-zA-Z0-9_-]*(\.[a-zA-Z_][a-zA-Z0-9_-]*|\.\d+)*$/,
  );
  if (match === null) {
    return undefined;
  }
  return resolvePath(trimmed.slice(1).split('.'), context);
}
