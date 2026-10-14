import { ForbiddenException } from '@nestjs/common';

import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { HostRulePolicyManager } from '../managers/host-rule-policy.manager';
import { type HostRuleRecord } from '../types/host-rules.types';
import { evaluateRules } from '../utilities/evaluate-rules.utility';
import { matchesRulePattern } from '../utilities/match-rule-pattern.utility';

function rule(kind: HostRuleKind, match: HostRuleMatch, pattern: string): HostRuleRecord {
  return {
    id: `${kind}-${match}-${pattern}`,
    kind,
    match,
    pattern,
    note: null,
    createdBy: 'admin-1',
    createdAt: new Date('2026-10-15T09:00:00.000Z'),
  };
}

describe('admin allow/deny rules', () => {
  describe('matchesRulePattern', () => {
    it('matches a host and its subdomains, never a look-alike suffix', () => {
      expect(matchesRulePattern(HostRuleMatch.HOST, 'evil.com', 'evil.com')).toBe(true);
      expect(matchesRulePattern(HostRuleMatch.HOST, 'mcp.evil.com', 'evil.com')).toBe(true);
      expect(matchesRulePattern(HostRuleMatch.HOST, 'notevil.com', 'evil.com')).toBe(false);
      expect(matchesRulePattern(HostRuleMatch.HOST, 'evil.com.attacker.io', 'evil.com')).toBe(
        false,
      );
      expect(matchesRulePattern(HostRuleMatch.HOST, 'MCP.Evil.COM.', 'evil.com')).toBe(true);
    });

    it('matches publisher and slug exactly, ignoring case', () => {
      expect(matchesRulePattern(HostRuleMatch.PUBLISHER, 'Acme', 'acme')).toBe(true);
      expect(matchesRulePattern(HostRuleMatch.PUBLISHER, 'Acme Corp', 'acme')).toBe(false);
      expect(matchesRulePattern(HostRuleMatch.SLUG, 'weather', 'weather')).toBe(true);
      expect(matchesRulePattern(HostRuleMatch.SLUG, 'weather-pro', 'weather')).toBe(false);
    });
  });

  describe('evaluateRules', () => {
    it('allows everything when there are no rules', () => {
      expect(evaluateRules([], { host: 'a.example.com', publisher: 'x', slug: 'y' })).toEqual({
        allowed: true,
      });
    });

    it('a deny rule refuses its host and leaves other hosts alone', () => {
      const rules = [rule(HostRuleKind.DENY, HostRuleMatch.HOST, 'evil.com')];

      expect(evaluateRules(rules, { host: 'mcp.evil.com' })).toMatchObject({
        allowed: false,
        reason: 'DENIED_BY_RULE',
      });
      expect(evaluateRules(rules, { host: 'mcp.good.com' })).toEqual({ allowed: true });
    });

    it('any allow rule of a type turns that type into an allow-list', () => {
      const rules = [rule(HostRuleKind.ALLOW, HostRuleMatch.HOST, 'good.com')];

      expect(evaluateRules(rules, { host: 'mcp.good.com' })).toEqual({ allowed: true });
      expect(evaluateRules(rules, { host: 'mcp.other.com' })).toEqual({
        allowed: false,
        reason: 'NOT_IN_ALLOW_LIST',
        match: HostRuleMatch.HOST,
      });
    });

    it('an allow-list of one type does not restrict the other types', () => {
      const rules = [rule(HostRuleKind.ALLOW, HostRuleMatch.HOST, 'good.com')];

      expect(evaluateRules(rules, { publisher: 'Anyone', slug: 'anything' })).toEqual({
        allowed: true,
      });
    });

    it('deny beats allow for the same host', () => {
      const rules = [
        rule(HostRuleKind.ALLOW, HostRuleMatch.HOST, 'good.com'),
        rule(HostRuleKind.DENY, HostRuleMatch.HOST, 'bad.good.com'),
      ];

      expect(evaluateRules(rules, { host: 'bad.good.com' })).toMatchObject({
        allowed: false,
        reason: 'DENIED_BY_RULE',
      });
    });

    it('checks publisher and slug rules too', () => {
      const rules = [
        rule(HostRuleKind.DENY, HostRuleMatch.PUBLISHER, 'shady inc'),
        rule(HostRuleKind.DENY, HostRuleMatch.SLUG, 'bad-plugin'),
      ];

      expect(evaluateRules(rules, { publisher: 'Shady Inc' }).allowed).toBe(false);
      expect(evaluateRules(rules, { slug: 'bad-plugin' }).allowed).toBe(false);
      expect(evaluateRules(rules, { publisher: 'Fine', slug: 'fine' }).allowed).toBe(true);
    });
  });

  describe('HostRulePolicyManager', () => {
    it('throws 403 PLUGIN_CURATION_HOST_DENIED without naming the rule', async () => {
      const repository = {
        findAll: vi
          .fn()
          .mockResolvedValue([rule(HostRuleKind.DENY, HostRuleMatch.HOST, 'evil.com')]),
      };
      const manager = new HostRulePolicyManager(repository as never);

      const failure = await manager
        .assertAllowed({ host: 'mcp.evil.com' })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ForbiddenException);
      const body = (failure as ForbiddenException).getResponse();
      expect(body).toMatchObject({ errorCode: 'PLUGIN_CURATION_HOST_DENIED' });
      expect(JSON.stringify(body)).not.toContain('evil.com');
    });

    it('reads the rules on every check so an edit applies at once', async () => {
      const repository = { findAll: vi.fn().mockResolvedValue([]) };
      const manager = new HostRulePolicyManager(repository as never);

      await manager.assertAllowed({ host: 'a.example.com' });
      await manager.assertAllowed({ host: 'a.example.com' });

      expect(repository.findAll).toHaveBeenCalledTimes(2);
    });
  });
});
