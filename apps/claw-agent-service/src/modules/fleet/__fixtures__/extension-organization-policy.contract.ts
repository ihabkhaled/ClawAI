import { z } from 'zod';

/**
 * A verbatim copy of what the coding-agent extension parses from
 * `GET agent/organizations/policy/effective`, so a change on this side that
 * the client would reject fails a test here instead of in a member's editor.
 *
 * Sources (apps/claw-coding-agent):
 *  - src/backend/contracts.ts            `organizationPolicySchema` (transport, strict)
 *  - src/core/policy-v2.ts               `policyRuleSchema`, `organizationPolicySchema`
 *  - src/core/organization-trust.ts      `organizationTrustSchema`
 *  - src/core/mcp/mcp-server-policy.ts   `mcpServerPolicySchema`
 *
 * Update this file only by copying from those sources again.
 */
export const extensionTransportSchema = z
  .object({
    allowedTools: z.array(z.string().max(200)).max(256),
    allowedModels: z.array(z.string().max(200)).max(1_000),
    maximumRisk: z.enum(['R0', 'R1', 'R2', 'R3', 'R4']),
    deniedEffects: z.array(z.string().max(100)).max(20),
    requireApproval: z.array(z.string().max(100)).max(20),
    maximumRetentionDays: z.number().int().min(0).max(3_650),
    minimumPermissionMode: z.enum(['PLAN', 'ASK', 'AUTO_EDIT', 'AUTONOMOUS_SCOPED']).nullable(),
    mcpServers: z.unknown().optional(),
    rules: z.unknown().optional(),
    trust: z.unknown().optional(),
  })
  .strict();

const EFFECT_KINDS = [
  'read',
  'workspace-write',
  'local-mutation',
  'network-write',
  'publication',
  'elevation',
  'production',
  'destructive',
] as const;

const extensionPolicyRuleSchema = z
  .object({
    tool: z.string().min(1).max(80).optional(),
    operation: z.string().min(1).max(80).optional(),
    pathGlob: z.string().min(1).max(1_000).optional(),
    commandGlob: z.string().min(1).max(1_000).optional(),
    domainGlob: z.string().min(1).max(253).optional(),
    outcome: z.enum(['ask', 'deny']),
    reason: z.string().min(1).max(500),
  })
  .strict()
  .refine(
    (rule) =>
      rule.tool !== undefined ||
      rule.operation !== undefined ||
      rule.pathGlob !== undefined ||
      rule.commandGlob !== undefined ||
      rule.domainGlob !== undefined,
  );

const globGroups = z
  .array(z.array(z.string().min(1).max(500)).max(200))
  .max(32)
  .default([]);

const extensionTrustSchema = z
  .object({ repositories: globGroups, domains: globGroups, commands: globGroups })
  .strict();

export const extensionEvaluationSchema = z
  .object({
    allowedTools: z.array(z.string().max(200)).max(256).default([]),
    maximumRisk: z.enum(['R0', 'R1', 'R2', 'R3', 'R4']).default('R4'),
    deniedEffects: z.array(z.enum(EFFECT_KINDS)).max(EFFECT_KINDS.length).default([]),
    requireApproval: z.array(z.enum(EFFECT_KINDS)).max(EFFECT_KINDS.length).default([]),
    rules: z.array(extensionPolicyRuleSchema).max(400).default([]),
    trust: extensionTrustSchema.default({ repositories: [], domains: [], commands: [] }),
  })
  .loose();

const extensionMcpPatternSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    command: z.string().min(1).max(1_000).optional(),
    url: z.string().min(1).max(2_048).optional(),
    reason: z.string().min(1).max(500).optional(),
  })
  .strict()
  .refine(
    (pattern) =>
      pattern.name !== undefined || pattern.command !== undefined || pattern.url !== undefined,
  );

export const extensionMcpServerPolicySchema = z
  .object({
    allow: z.array(extensionMcpPatternSchema).max(200).default([]),
    deny: z.array(extensionMcpPatternSchema).max(200).default([]),
  })
  .strict();
