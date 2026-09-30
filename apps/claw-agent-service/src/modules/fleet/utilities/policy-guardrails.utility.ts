import {
  DENY_EVERY_MCP_SERVER,
  MCP_DISJOINT_ALLOWLISTS_REASON,
} from '../constants/organization-policy-guardrails.constants';
import {
  type McpServerPattern,
  type McpServerPolicy,
  mcpServerPolicySchema,
  type OrganizationTrustLists,
  organizationTrustListsSchema,
  type PolicyRule,
  policyRulesSchema,
} from '../dto/organization-policy-guardrails.dto';

import type { EffectiveTrustGroups, ParsedGuardrails } from '../types/organization-policy.types';

/** One organization's list becomes one group; an empty list constrains nothing and is dropped. */
function toGroups(lists: OrganizationTrustLists): EffectiveTrustGroups {
  const group = (list: readonly string[]): (readonly string[])[] =>
    list.length === 0 ? [] : [[...list]];
  return {
    repositories: group(lists.repositories),
    domains: group(lists.domains),
    commands: group(lists.commands),
  };
}

/**
 * Parses the three JSON columns of one stored policy.
 *
 * They were validated on write, so a failure means the row was edited outside
 * this service or the schema moved. Either way it was someone's intent to
 * restrict, so the caller is told to fail closed rather than to drop the block.
 */
export function parseStoredGuardrails(row: {
  rules: unknown;
  trust: unknown;
  mcpServers: unknown;
}): ParsedGuardrails {
  const rules = policyRulesSchema.safeParse(row.rules);
  const trust = organizationTrustListsSchema.safeParse(row.trust);
  const mcp = mcpServerPolicySchema.safeParse(row.mcpServers);
  const unreadable = !rules.success || !trust.success || !mcp.success;
  return {
    rules: rules.success ? rules.data : [],
    trust: trust.success ? toGroups(trust.data) : { repositories: [], domains: [], commands: [] },
    mcpServers:
      mcp.success && !unreadable ? mcp.data : { allow: [], deny: [DENY_EVERY_MCP_SERVER] },
    unreadable,
  };
}

function ruleKey(rule: PolicyRule): string {
  return JSON.stringify([
    rule.tool,
    rule.operation,
    rule.pathGlob,
    rule.commandGlob,
    rule.domainGlob,
    rule.outcome,
    rule.reason,
  ]);
}

/** Reasons do not change what a pattern matches, so they are not part of its identity. */
function patternKey(pattern: McpServerPattern): string {
  return JSON.stringify([pattern.name, pattern.command, pattern.url]);
}

function dedupe<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Every organization's rules apply; the client decides deny-beats-ask. */
export function mergeRules(
  left: readonly PolicyRule[],
  right: readonly PolicyRule[],
): PolicyRule[] {
  return dedupe([...left, ...right], ruleKey);
}

/** Groups concatenate, never union: a subject must satisfy every organization's list. */
export function mergeTrust(
  left: EffectiveTrustGroups,
  right: EffectiveTrustGroups,
): EffectiveTrustGroups {
  return {
    repositories: [...left.repositories, ...right.repositories],
    domains: [...left.domains, ...right.domains],
    commands: [...left.commands, ...right.commands],
  };
}

/**
 * Deny is the union. Allow is narrower than either input: patterns both lists
 * carry verbatim. Pattern-level intersection of globs is not expressible in the
 * client's shape, so this under-approximates, which only ever refuses more. When
 * no pattern is common, an empty `allow` would admit everything, so the merge
 * adds a deny-everything pattern instead.
 */
export function mergeMcpServers(left: McpServerPolicy, right: McpServerPolicy): McpServerPolicy {
  const deny = dedupe([...left.deny, ...right.deny], patternKey);
  if (left.allow.length === 0) return { allow: [...right.allow], deny };
  if (right.allow.length === 0) return { allow: [...left.allow], deny };
  const rightKeys = new Set(right.allow.map(patternKey));
  const allow = left.allow.filter((pattern) => rightKeys.has(patternKey(pattern)));
  return allow.length > 0
    ? { allow, deny }
    : { allow: [], deny: [...deny, { name: '*', reason: MCP_DISJOINT_ALLOWLISTS_REASON }] };
}
