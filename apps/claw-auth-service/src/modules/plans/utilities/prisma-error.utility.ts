/**
 * True for a Prisma P2002 unique-constraint failure that names the user column.
 *
 * Reads the shape rather than the class for the reason given at the call site:
 * the generated client exists twice in a dev container, so `instanceof` against
 * it is unreliable while `code` and `meta.target` are stable.
 */
export function isUniqueViolationOnUser(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== 'P2002') {
    return false;
  }
  // Any P2002 from the trial transaction means the redemption row already
  // exists: `plan_trial_redemptions.user_id` is the only unique constraint that
  // transaction can violate. The target shape is checked when present, but a
  // client that reports it differently must not turn "already redeemed" back
  // into a 500 — that is the failure this guard exists to prevent.
  const target = candidate.meta?.target;
  if (Array.isArray(target)) {
    return target.some((entry) => typeof entry === 'string' && entry.includes('user_id'));
  }
  if (typeof target === 'string') {
    return target.includes('user_id');
  }
  return true;
}
