import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { AdapterError } from '../errors/adapter.error';
import { type Cursor } from '../types/math.types';
import {
  EXPRESSION_EXPONENT_PATTERN,
  EXPRESSION_MANTISSA_PATTERN,
  EXPRESSION_MAX_DEPTH,
} from '../constants/math.constants';

function fail(message: string): never {
  throw new AdapterError(AdapterFailureKind.BAD_INPUT, message);
}

function skipSpaces(cursor: Cursor): void {
  while (cursor.text[cursor.index] === ' ') cursor.index += 1;
}

function peek(cursor: Cursor): string {
  skipSpaces(cursor);
  return cursor.text[cursor.index] ?? '';
}

function enter(cursor: Cursor): void {
  cursor.depth += 1;
  if (cursor.depth > EXPRESSION_MAX_DEPTH) fail('The expression is nested too deeply');
}

function parsePrimary(cursor: Cursor): number {
  const next = peek(cursor);
  if (next === '(') {
    cursor.index += 1;
    enter(cursor);
    const value = parseSum(cursor);
    if (peek(cursor) !== ')') fail('A closing parenthesis is missing');
    cursor.index += 1;
    cursor.depth -= 1;
    return value;
  }
  const rest = cursor.text.slice(cursor.index);
  const mantissa = EXPRESSION_MANTISSA_PATTERN.exec(rest)?.[0] ?? '';
  if (!/[0-9]/.test(mantissa)) return fail('Expected a number');
  const exponent = EXPRESSION_EXPONENT_PATTERN.exec(rest.slice(mantissa.length))?.[0] ?? '';
  cursor.index += mantissa.length + exponent.length;
  return Number(mantissa + exponent);
}

function parseUnary(cursor: Cursor): number {
  const next = peek(cursor);
  if (next === '-' || next === '+') {
    cursor.index += 1;
    enter(cursor);
    const value = parseUnary(cursor);
    cursor.depth -= 1;
    return next === '-' ? -value : value;
  }
  const base = parsePrimary(cursor);
  if (peek(cursor) !== '^') return base;
  cursor.index += 1;
  enter(cursor);
  const exponent = parseUnary(cursor);
  cursor.depth -= 1;
  return base ** exponent;
}

function parseProduct(cursor: Cursor): number {
  let value = parseUnary(cursor);
  for (let next = peek(cursor); next === '*' || next === '/' || next === '%'; next = peek(cursor)) {
    cursor.index += 1;
    const right = parseUnary(cursor);
    if ((next === '/' || next === '%') && right === 0) fail('Division by zero');
    if (next === '*') value *= right;
    else value = next === '/' ? value / right : value % right;
  }
  return value;
}

function parseSum(cursor: Cursor): number {
  let value = parseProduct(cursor);
  for (let next = peek(cursor); next === '+' || next === '-'; next = peek(cursor)) {
    cursor.index += 1;
    const right = parseProduct(cursor);
    value = next === '+' ? value + right : value - right;
  }
  return value;
}

/**
 * Evaluates + - * / % ^ and parentheses over decimal numbers with a recursive-descent parser. It
 * is a calculator and nothing else: no names, no calls, no eval, a nesting limit, and a result
 * that must be a finite number. Throws an AdapterError whose message is safe to show.
 */
export function evaluateExpression(expression: string): number {
  const cursor: Cursor = { text: expression, index: 0, depth: 0 };
  const value = parseSum(cursor);
  if (peek(cursor) !== '') fail('Unexpected character in the expression');
  if (!Number.isFinite(value)) fail('The result is not a finite number');
  return value;
}
