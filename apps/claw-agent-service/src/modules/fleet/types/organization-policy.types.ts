/**
 * The policy shape sent to a coding-agent client.
 *
 * Deliberately not the Prisma row: the client has no use for `id`,
 * `organizationId` or timestamps, and sending them would leak which
 * organization imposed a constraint to a member who may only belong to one of
 * several. It is also the shape the intersection works in, so combining
 * policies never has to think about identity.
 */
export interface EffectivePolicy {
  readonly allowedTools: readonly string[];
  readonly allowedModels: readonly string[];
  readonly maximumRisk: string;
  readonly deniedEffects: readonly string[];
  readonly requireApproval: readonly string[];
  readonly maximumRetentionDays: number;
  readonly minimumPermissionMode: string | null;
}
