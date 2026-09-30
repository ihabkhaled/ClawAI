import type { McpServerPolicy, PolicyRule } from '../dto/organization-policy-guardrails.dto';

/**
 * Trust lists as the client reads them: one group per organization that set a
 * list. A subject must match every group, so a user in two organizations is
 * held to both — a flattened union would silently loosen the stricter one.
 */
export interface EffectiveTrustGroups {
  readonly repositories: readonly (readonly string[])[];
  readonly domains: readonly (readonly string[])[];
  readonly commands: readonly (readonly string[])[];
}

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
  /** F053: every organization's rules; any deny beats any ask on the client. */
  readonly rules: readonly PolicyRule[];
  /** F053: see `EffectiveTrustGroups`. */
  readonly trust: EffectiveTrustGroups;
  /** F054: deny is the union; allow is the common patterns (or deny-all when none). */
  readonly mcpServers: McpServerPolicy;
  /**
   * F081: marketplaces members may install plugins from. Absent means no
   * organization set a list; `[]` means none is allowed. Across organizations
   * only the sources every listing organization names survive.
   */
  readonly allowedPluginMarketplaces?: readonly string[];
}

/** The row fields `toEffectivePolicy` reads; the JSON columns arrive unparsed. */
export interface StoredOrganizationPolicy {
  allowedTools: string[];
  allowedModels: string[];
  maximumRisk: string;
  deniedEffects: string[];
  requireApproval: string[];
  maximumRetentionDays: number;
  minimumPermissionMode: string | null;
  rules: unknown;
  trust: unknown;
  mcpServers: unknown;
  allowedPluginMarketplaces?: unknown;
}

/** One stored policy's JSON columns, parsed. */
export interface ParsedGuardrails {
  readonly rules: readonly PolicyRule[];
  readonly trust: EffectiveTrustGroups;
  readonly mcpServers: McpServerPolicy;
  /** True when a stored block no longer parses; the caller must fail closed. */
  readonly unreadable: boolean;
}
