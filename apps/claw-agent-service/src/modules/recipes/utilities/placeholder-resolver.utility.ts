import {
  PATH_PREFIX_REGEX,
  ESCAPED_PREFIX_REGEX,
} from '../../../common/constants/recipe.constants';
import { resolveRecipePath } from '../../../common/utilities/recipe-expression.utility';
import type { RecipeExpressionContext } from '../../../common/types/recipe-parser.types';

/**
 * Walk any object tree and substitute leaf string values that look
 * like `$params.<name>` or `$steps.<id>.output.<dot.path>` with the
 * resolved value from the context.
 *
 * Anything else is returned untouched. Used by the recipe runner to
 * realise per-step `target` and `payload` from the DSL.
 *
 * The substitution pattern is deliberately strict: the entire string
 * must be the path (no template literal interpolation). For a literal
 * string that begins with `$`, double the prefix (`$$`) to escape.
 */

export function resolvePlaceholders<T>(input: T, context: RecipeExpressionContext): T {
  return walk(input, context) as T;
}

function walk(value: unknown, ctx: RecipeExpressionContext): unknown {
  if (typeof value === 'string') {
    return resolveString(value, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((v) => walk(v, ctx));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, ctx);
    }
    return out;
  }
  return value;
}

function resolveString(value: string, ctx: RecipeExpressionContext): unknown {
  if (ESCAPED_PREFIX_REGEX.test(value)) {
    return value.slice(1);
  }
  if (!PATH_PREFIX_REGEX.test(value)) {
    return value;
  }
  return resolveRecipePath(value, ctx);
}
