/**
 * Size bounds for F053 rules / trust lists and F054 MCP patterns.
 *
 * Each is the extension's own bound (`policy-v2.ts`, `organization-trust.ts`,
 * `mcp/mcp-server-policy.ts`) for ONE organization, so a single organization's
 * policy always parses on the client. The client caps merged rules at 400 and
 * trust groups at 32; a user whose organizations exceed that fails closed
 * there, which is the safe direction. Truncating here would drop deny rules.
 */
export const GUARDRAIL_LIMITS = {
  rulesPerOrganization: 200,
  ruleToolLength: 80,
  ruleOperationLength: 80,
  ruleGlobLength: 1_000,
  ruleDomainGlobLength: 253,
  ruleReasonLength: 500,
  trustEntriesPerList: 200,
  trustGlobLength: 500,
  mcpPatternsPerList: 200,
  mcpNameLength: 200,
  mcpCommandLength: 1_000,
  mcpUrlLength: 2_048,
  mcpReasonLength: 500,
} as const;

export const POLICY_RULE_OUTCOMES = ['ask', 'deny'] as const;

/** Zod refine messages; developer-facing validation codes, not UI copy. */
export const POLICY_RULE_MATCHER_REQUIRED = 'POLICY_RULE_MATCHER_REQUIRED';
export const MCP_PATTERN_MATCHER_REQUIRED = 'MCP_PATTERN_MATCHER_REQUIRED';

/**
 * Written into an MCP allow/deny intersection that has no common pattern.
 * Two organizations with disjoint allowlists admit no server, and an empty
 * `allow` would mean the opposite, so the merge denies everything instead.
 */
export const MCP_DISJOINT_ALLOWLISTS_REASON =
  'Your organizations allow disjoint MCP servers, so none may start.';

/** What an unreadable stored MCP block becomes: someone meant to restrict, so refuse all. */
export const DENY_EVERY_MCP_SERVER = {
  name: '*',
  reason: 'The organization MCP server policy could not be read.',
} as const;
