import type { RetrievalBundle } from '@claw/shared-types';
import type { Prisma } from '../../generated/prisma';

export function bundleToInputJson(bundle: RetrievalBundle): Prisma.InputJsonValue {
  // RetrievalBundle is a plain JSON-shaped DTO (no Date / Function / BigInt /
  // undefined). Round-tripping through JSON normalizes the structure and
  // satisfies Prisma's InputJsonValue contract without an `as unknown as` cast.
  return JSON.parse(JSON.stringify(bundle)) as Prisma.InputJsonValue;
}

export function inputJsonToBundle(payload: Prisma.JsonValue): RetrievalBundle {
  // Inverse of bundleToInputJson — payload was written via the helper above
  // so we know it matches the bundle shape.
  return JSON.parse(JSON.stringify(payload)) as RetrievalBundle;
}
