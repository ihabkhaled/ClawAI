import { recipeDslSchema } from '../dto/recipe-dsl.dto';
import type { Prisma } from '../../../generated/prisma';
import type { RecipeDsl } from '../types/recipe.types';

/**
 * Re-parse a Prisma JSON column into a typed RecipeDsl.
 *
 * The DSL is validated at create / update time, so by the time we read
 * it from `Recipe.dsl` it should already conform — but Prisma's
 * `JsonValue` is intentionally broad. This helper re-validates the
 * stored shape so the consumer gets a typed value without an unsafe
 * cast. If the stored row is somehow malformed (e.g. legacy schema),
 * the Zod parser throws, which is the correct failure mode.
 */
export function dslFromJson(value: Prisma.JsonValue): RecipeDsl {
  return recipeDslSchema.parse(value);
}
