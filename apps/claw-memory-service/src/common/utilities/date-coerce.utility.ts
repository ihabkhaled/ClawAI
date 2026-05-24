export function parsePausedUntil(value: string | null | undefined): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return new Date(value);
}

export function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  return parsePausedUntil(value);
}
