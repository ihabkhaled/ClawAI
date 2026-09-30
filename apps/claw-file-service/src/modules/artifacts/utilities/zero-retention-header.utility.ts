/**
 * The coding agent sends `X-Claw-Zero-Retention: 1`. Any value other than an
 * explicit off is honoured: a refusal the user did not need costs a retry, a
 * stored page they asked us not to keep cannot be taken back.
 */
export function isZeroRetentionRequested(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
}
