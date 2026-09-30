import {
  mergeMcpServers,
  mergeRules,
  mergeTrust,
  parseStoredGuardrails,
} from '../policy-guardrails.utility';
import { intersectPolicies, toEffectivePolicy } from '../policy-intersection.utility';
import { MCP_DISJOINT_ALLOWLISTS_REASON } from '../../constants/organization-policy-guardrails.constants';
import { POLICY_EFFECT_KINDS } from '../../dto/organization-policy.dto';

const base = {
  allowedTools: [],
  allowedModels: [],
  maximumRisk: 'R4',
  deniedEffects: [],
  requireApproval: [],
  maximumRetentionDays: 3_650,
  minimumPermissionMode: null,
};
const emptyGuardrails = {
  rules: [],
  trust: { repositories: [], domains: [], commands: [] },
  mcpServers: { allow: [], deny: [] },
};
const denyShell = { tool: 'terminal.run', outcome: 'deny' as const, reason: 'No shell.' };
const askPush = { commandGlob: 'git push*', outcome: 'ask' as const, reason: 'Pushes.' };

describe('parseStoredGuardrails', () => {
  it('turns one organization list into one group and drops empty lists', () => {
    const parsed = parseStoredGuardrails({
      rules: [denyShell],
      trust: { repositories: ['github.com/acme/*'], domains: [], commands: ['npm *'] },
      mcpServers: { allow: [{ name: 'github' }], deny: [] },
    });

    expect(parsed).toEqual({
      rules: [denyShell],
      trust: { repositories: [['github.com/acme/*']], domains: [], commands: [['npm *']] },
      mcpServers: { allow: [{ name: 'github' }], deny: [] },
      unreadable: false,
    });
  });

  // Someone meant to restrict; reading the block as absent would invert that.
  it('fails closed on a block that no longer parses', () => {
    const parsed = parseStoredGuardrails({ ...emptyGuardrails, rules: [{ outcome: 'allow' }] });

    expect(parsed.unreadable).toBe(true);
    expect(parsed.mcpServers.deny).toEqual([expect.objectContaining({ name: '*' })]);
  });

  it('makes toEffectivePolicy deny every effect when a block is unreadable', () => {
    const effective = toEffectivePolicy({ ...base, ...emptyGuardrails, trust: 'garbage' });

    expect(effective.deniedEffects).toEqual([...POLICY_EFFECT_KINDS]);
  });

  it('keeps the stored denied effects when every block reads', () => {
    const effective = toEffectivePolicy({ ...base, ...emptyGuardrails, deniedEffects: ['read'] });

    expect(effective.deniedEffects).toEqual(['read']);
  });
});

describe('merging across organizations', () => {
  it('keeps every rule once', () => {
    expect(mergeRules([denyShell], [denyShell, askPush])).toEqual([denyShell, askPush]);
  });

  // A user in two organizations is held to both lists, not their union.
  it('concatenates trust groups', () => {
    expect(
      mergeTrust(
        { repositories: [['github.com/a/*']], domains: [], commands: [] },
        { repositories: [['github.com/b/*']], domains: [['*.b.com']], commands: [] },
      ),
    ).toEqual({
      repositories: [['github.com/a/*'], ['github.com/b/*']],
      domains: [['*.b.com']],
      commands: [],
    });
  });

  it('unions MCP denies and adopts the only non-empty allowlist', () => {
    expect(
      mergeMcpServers(
        { allow: [], deny: [{ name: 'shell' }] },
        {
          allow: [{ name: 'github' }],
          deny: [{ name: 'shell', reason: 'dup' }, { url: 'http://*' }],
        },
      ),
    ).toEqual({ allow: [{ name: 'github' }], deny: [{ name: 'shell' }, { url: 'http://*' }] });
    expect(mergeMcpServers({ allow: [{ name: 'a' }], deny: [] }, { allow: [], deny: [] })).toEqual({
      allow: [{ name: 'a' }],
      deny: [],
    });
  });

  it('keeps only the allow patterns both organizations list', () => {
    expect(
      mergeMcpServers(
        { allow: [{ name: 'github' }, { name: 'jira' }], deny: [] },
        { allow: [{ name: 'github' }], deny: [] },
      ),
    ).toEqual({ allow: [{ name: 'github' }], deny: [] });
  });

  // An empty allow would admit everything, the opposite of two disjoint lists.
  it('denies every server when two allowlists share nothing', () => {
    expect(
      mergeMcpServers({ allow: [{ name: 'a' }], deny: [] }, { allow: [{ name: 'b' }], deny: [] }),
    ).toEqual({ allow: [], deny: [{ name: '*', reason: MCP_DISJOINT_ALLOWLISTS_REASON }] });
  });

  it('carries the guardrails through intersectPolicies', () => {
    const effective = intersectPolicies([
      toEffectivePolicy({ ...base, ...emptyGuardrails, rules: [denyShell] }),
      toEffectivePolicy({
        ...base,
        ...emptyGuardrails,
        rules: [askPush],
        trust: { repositories: ['github.com/b/*'], domains: [], commands: [] },
      }),
    ]);

    expect(effective.rules).toEqual([denyShell, askPush]);
    expect(effective.trust.repositories).toEqual([['github.com/b/*']]);
  });
});
