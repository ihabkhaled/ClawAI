import { z } from 'zod';

import {
  GUARDRAIL_LIMITS as L,
  MCP_PATTERN_MATCHER_REQUIRED,
  POLICY_RULE_MATCHER_REQUIRED,
  POLICY_RULE_OUTCOMES,
} from '../constants/organization-policy-guardrails.constants';

/**
 * One organization rule. The same shape as the extension's `policyRuleSchema`
 * (`src/core/policy-v2.ts`): `outcome` has no `allow` because a rule may only
 * tighten, and patterns are `*` globs, never regular expressions.
 */
export const policyRuleSchema = z
  .object({
    tool: z.string().min(1).max(L.ruleToolLength).optional(),
    operation: z.string().min(1).max(L.ruleOperationLength).optional(),
    pathGlob: z.string().min(1).max(L.ruleGlobLength).optional(),
    commandGlob: z.string().min(1).max(L.ruleGlobLength).optional(),
    domainGlob: z.string().min(1).max(L.ruleDomainGlobLength).optional(),
    outcome: z.enum(POLICY_RULE_OUTCOMES),
    reason: z.string().min(1).max(L.ruleReasonLength),
  })
  .strict()
  .refine(
    (rule) =>
      rule.tool !== undefined ||
      rule.operation !== undefined ||
      rule.pathGlob !== undefined ||
      rule.commandGlob !== undefined ||
      rule.domainGlob !== undefined,
    POLICY_RULE_MATCHER_REQUIRED,
  );

export const policyRulesSchema = z.array(policyRuleSchema).max(L.rulesPerOrganization);

const trustList = z
  .array(z.string().min(1).max(L.trustGlobLength))
  .max(L.trustEntriesPerList)
  .default([]);

/**
 * One organization's trust lists. The client receives them as one group per
 * organization (`organization-trust.ts`); this is a single group.
 */
export const organizationTrustListsSchema = z
  .object({ repositories: trustList, domains: trustList, commands: trustList })
  .strict();

/** The extension's `mcpServerPatternSchema` (`src/core/mcp/mcp-server-policy.ts`). */
export const mcpServerPatternSchema = z
  .object({
    name: z.string().min(1).max(L.mcpNameLength).optional(),
    command: z.string().min(1).max(L.mcpCommandLength).optional(),
    url: z.string().min(1).max(L.mcpUrlLength).optional(),
    reason: z.string().min(1).max(L.mcpReasonLength).optional(),
  })
  .strict()
  .refine(
    (pattern) =>
      pattern.name !== undefined || pattern.command !== undefined || pattern.url !== undefined,
    MCP_PATTERN_MATCHER_REQUIRED,
  );

export const mcpServerPolicySchema = z
  .object({
    allow: z.array(mcpServerPatternSchema).max(L.mcpPatternsPerList).default([]),
    deny: z.array(mcpServerPatternSchema).max(L.mcpPatternsPerList).default([]),
  })
  .strict();

export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type OrganizationTrustLists = z.infer<typeof organizationTrustListsSchema>;
export type McpServerPattern = z.infer<typeof mcpServerPatternSchema>;
export type McpServerPolicy = z.infer<typeof mcpServerPolicySchema>;
