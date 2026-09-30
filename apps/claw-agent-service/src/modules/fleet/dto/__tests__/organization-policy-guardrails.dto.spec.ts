import {
  mcpServerPolicySchema,
  organizationTrustListsSchema,
  policyRulesSchema,
} from '../organization-policy-guardrails.dto';
import { updateOrganizationPolicySchema } from '../organization-policy.dto';
import {
  MCP_PATTERN_MATCHER_REQUIRED,
  POLICY_RULE_MATCHER_REQUIRED,
} from '../../constants/organization-policy-guardrails.constants';

describe('organization policy guardrail DTOs', () => {
  describe('rules', () => {
    it('accepts deny and ask rules on every matcher', () => {
      const parsed = policyRulesSchema.safeParse([
        { tool: 'terminal.run', outcome: 'deny', reason: 'No shell.' },
        { commandGlob: 'git push*', outcome: 'ask', reason: 'Pushes need a human.' },
        { pathGlob: '**/.env*', operation: 'write', outcome: 'deny', reason: 'Secrets.' },
        { domainGlob: '*.internal', outcome: 'deny', reason: 'Internal hosts.' },
      ]);

      expect(parsed.success).toBe(true);
    });

    // A rule may only tighten: an organization cannot grant through a rule.
    it('refuses an allow outcome', () => {
      expect(
        policyRulesSchema.safeParse([{ tool: 'x', outcome: 'allow', reason: 'r' }]).success,
      ).toBe(false);
    });

    it('refuses a rule that matches on nothing', () => {
      const parsed = policyRulesSchema.safeParse([{ outcome: 'deny', reason: 'r' }]);

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]?.message).toBe(POLICY_RULE_MATCHER_REQUIRED);
    });

    it('refuses unknown keys, a missing reason and oversized fields', () => {
      expect(
        policyRulesSchema.safeParse([{ tool: 'x', outcome: 'deny', reason: 'r', regex: '.*' }])
          .success,
      ).toBe(false);
      expect(policyRulesSchema.safeParse([{ tool: 'x', outcome: 'deny' }]).success).toBe(false);
      expect(
        policyRulesSchema.safeParse([{ domainGlob: 'a'.repeat(254), outcome: 'deny', reason: 'r' }])
          .success,
      ).toBe(false);
    });

    it('caps one organization at 200 rules', () => {
      const rule = { tool: 'x', outcome: 'deny', reason: 'r' };

      expect(policyRulesSchema.safeParse(Array(200).fill(rule)).success).toBe(true);
      expect(policyRulesSchema.safeParse(Array(201).fill(rule)).success).toBe(false);
    });
  });

  describe('trust', () => {
    it('defaults missing lists to empty', () => {
      expect(organizationTrustListsSchema.parse({ domains: ['*.example.com'] })).toEqual({
        repositories: [],
        domains: ['*.example.com'],
        commands: [],
      });
    });

    it('refuses empty globs, oversized globs, long lists and unknown lists', () => {
      expect(organizationTrustListsSchema.safeParse({ domains: [''] }).success).toBe(false);
      expect(organizationTrustListsSchema.safeParse({ commands: ['a'.repeat(501)] }).success).toBe(
        false,
      );
      expect(
        organizationTrustListsSchema.safeParse({ repositories: Array(201).fill('github.com/*') })
          .success,
      ).toBe(false);
      expect(organizationTrustListsSchema.safeParse({ hosts: [] }).success).toBe(false);
    });
  });

  describe('mcpServers', () => {
    it('accepts name, command and url patterns', () => {
      expect(
        mcpServerPolicySchema.safeParse({
          allow: [{ name: 'github' }, { url: 'https://mcp.example.com/*' }],
          deny: [{ command: 'npx *', reason: 'No ad-hoc packages.' }],
        }).success,
      ).toBe(true);
    });

    it('refuses a pattern with no matcher', () => {
      const parsed = mcpServerPolicySchema.safeParse({ deny: [{ reason: 'r' }] });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]?.message).toBe(MCP_PATTERN_MATCHER_REQUIRED);
    });

    it('refuses more than 200 patterns per list and unknown keys', () => {
      expect(
        mcpServerPolicySchema.safeParse({ deny: Array(201).fill({ name: 'x' }) }).success,
      ).toBe(false);
      expect(mcpServerPolicySchema.safeParse({ allow: [], deny: [], block: [] }).success).toBe(
        false,
      );
    });
  });

  describe('update body', () => {
    // A PUT replaces the whole policy, so an old admin client that omits the
    // new blocks saves "none" rather than failing validation.
    it('defaults the three blocks when absent', () => {
      expect(updateOrganizationPolicySchema.parse({})).toMatchObject({
        rules: [],
        trust: { repositories: [], domains: [], commands: [] },
        mcpServers: { allow: [], deny: [] },
      });
    });

    it('rejects a malformed block in the body', () => {
      expect(
        updateOrganizationPolicySchema.safeParse({ rules: [{ outcome: 'deny', reason: 'r' }] })
          .success,
      ).toBe(false);
    });
  });
});
