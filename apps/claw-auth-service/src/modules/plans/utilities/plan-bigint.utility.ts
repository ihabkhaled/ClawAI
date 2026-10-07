/**
 * A BIGINT plan column as a JSON number, or null. These columns are micro-USD figures far inside
 * the safe-integer range; serialising a bigint itself would throw at the controller.
 */
export function toNumberOrNull(value: bigint | null): number | null {
  return value === null ? null : Number(value);
}
