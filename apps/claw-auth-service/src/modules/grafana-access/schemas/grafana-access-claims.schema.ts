import { z } from 'zod';

/**
 * The claims a Grafana access cookie carries once its signature, audience,
 * issuer and expiry have been verified. Parsed rather than cast: a token that
 * verifies but is missing its session id must be refused, because the session
 * id is what ties the cookie to revocation.
 */
export const grafanaAccessClaimsSchema = z.object({
  sub: z.string().min(1).max(128),
  email: z.string().email().max(320),
  sid: z.string().min(1).max(128),
});

export type GrafanaAccessClaims = z.infer<typeof grafanaAccessClaimsSchema>;
