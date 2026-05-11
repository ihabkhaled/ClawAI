/// Clamps a number to [0, 1]. Used for raw-dimension scoring before weights.
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/// Validates that a numeric record sums to approximately 1.0 (±tolerance).
export function sumsToOne(values: ReadonlyArray<number>, tolerance: number): boolean {
  const total = values.reduce((acc, v) => acc + v, 0);
  return Math.abs(total - 1) <= tolerance;
}
