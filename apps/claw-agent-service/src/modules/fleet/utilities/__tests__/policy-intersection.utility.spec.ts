import { UNCONSTRAINED_POLICY } from '../../constants/organization-policy.constants';
import { intersectPolicies, toEffectivePolicy } from '../policy-intersection.utility';

import { extensionTransportSchema } from '../../__fixtures__/extension-organization-policy.contract';
import type { EffectivePolicy } from '../../types/organization-policy.types';

function policy(overrides: Partial<EffectivePolicy> = {}): EffectivePolicy {
  return { ...UNCONSTRAINED_POLICY, ...overrides };
}

describe('intersectPolicies: plugin marketplaces (F081)', () => {
  it('stays absent when no organization set a list', () => {
    expect('allowedPluginMarketplaces' in intersectPolicies([policy(), policy()])).toBe(false);
  });

  it('applies a single list as written, including "none allowed"', () => {
    expect(
      intersectPolicies([policy(), policy({ allowedPluginMarketplaces: ['a'] })])
        .allowedPluginMarketplaces,
    ).toEqual(['a']);
    expect(
      intersectPolicies([policy({ allowedPluginMarketplaces: [] })]).allowedPluginMarketplaces,
    ).toEqual([]);
  });

  it('keeps only the sources every listing organization names', () => {
    expect(
      intersectPolicies([
        policy({ allowedPluginMarketplaces: ['a', 'b'] }),
        policy({ allowedPluginMarketplaces: ['b', 'c'] }),
      ]).allowedPluginMarketplaces,
    ).toEqual(['b']);
  });
});

describe('toEffectivePolicy: plugin marketplaces (F081)', () => {
  const row = {
    allowedTools: [],
    allowedModels: [],
    maximumRisk: 'R4',
    deniedEffects: [],
    requireApproval: [],
    maximumRetentionDays: 3650,
    minimumPermissionMode: null,
    rules: [],
    trust: { repositories: [], domains: [], commands: [] },
    mcpServers: { allow: [], deny: [] },
  };

  it('omits the field for a NULL column (no opinion)', () => {
    expect('allowedPluginMarketplaces' in toEffectivePolicy(row)).toBe(false);
    expect(
      'allowedPluginMarketplaces' in toEffectivePolicy({ ...row, allowedPluginMarketplaces: null }),
    ).toBe(false);
  });

  it('is accepted by the extension transport schema (strict)', () => {
    const effective = toEffectivePolicy({ ...row, allowedPluginMarketplaces: ['a'] });

    expect(extensionTransportSchema.safeParse(effective).success).toBe(true);
  });

  it('emits a stored list, and [] for one that no longer parses (fail closed)', () => {
    expect(
      toEffectivePolicy({ ...row, allowedPluginMarketplaces: ['https://m.example'] })
        .allowedPluginMarketplaces,
    ).toEqual(['https://m.example']);
    expect(
      toEffectivePolicy({ ...row, allowedPluginMarketplaces: { bad: true } })
        .allowedPluginMarketplaces,
    ).toEqual([]);
  });
});

describe('intersectPolicies', () => {
  it('leaves a user in no organization unconstrained', () => {
    expect(intersectPolicies([])).toEqual(UNCONSTRAINED_POLICY);
  });

  it('returns a single policy unchanged', () => {
    const single = policy({ maximumRisk: 'R2', deniedEffects: ['publication'] });

    expect(intersectPolicies([single])).toMatchObject({
      maximumRisk: 'R2',
      deniedEffects: ['publication'],
    });
  });

  // A user in a permissive organization and a strict one must not escape the
  // strict one by holding both memberships.
  it('takes the stricter risk ceiling', () => {
    expect(
      intersectPolicies([policy({ maximumRisk: 'R4' }), policy({ maximumRisk: 'R1' })]),
    ).toMatchObject({ maximumRisk: 'R1' });
    expect(
      intersectPolicies([policy({ maximumRisk: 'R1' }), policy({ maximumRisk: 'R4' })]),
    ).toMatchObject({ maximumRisk: 'R1' });
  });

  it('unions denials and required approvals, so either organization can refuse', () => {
    const combined = intersectPolicies([
      policy({ deniedEffects: ['publication'], requireApproval: ['local-mutation'] }),
      policy({ deniedEffects: ['elevation'], requireApproval: ['publication'] }),
    ]);

    expect(combined.deniedEffects).toEqual(expect.arrayContaining(['publication', 'elevation']));
    expect(combined.requireApproval).toEqual(
      expect.arrayContaining(['local-mutation', 'publication']),
    );
  });

  // An empty allowlist means "everything", so this cannot be a plain set
  // intersection: [] against ['a'] must be ['a'], not [].
  it('treats an empty allowlist as unrestricted rather than as nothing allowed', () => {
    expect(
      intersectPolicies([
        policy({ allowedTools: [] }),
        policy({ allowedTools: ['workspace.files'] }),
      ]).allowedTools,
    ).toEqual(['workspace.files']);

    expect(
      intersectPolicies([
        policy({ allowedTools: ['workspace.files'] }),
        policy({ allowedTools: [] }),
      ]).allowedTools,
    ).toEqual(['workspace.files']);
  });

  it('intersects two non-empty allowlists down to what both permit', () => {
    const combined = intersectPolicies([
      policy({ allowedTools: ['workspace.files', 'workspace.git'] }),
      policy({ allowedTools: ['workspace.git', 'workspace.command'] }),
    ]);

    expect(combined.allowedTools).toEqual(['workspace.git']);
  });

  it('can intersect two allowlists down to nothing, which is a real answer', () => {
    expect(
      intersectPolicies([policy({ allowedModels: ['a'] }), policy({ allowedModels: ['b'] })])
        .allowedModels,
    ).toEqual([]);
  });

  it('keeps the shortest retention', () => {
    expect(
      intersectPolicies([
        policy({ maximumRetentionDays: 3_650 }),
        policy({ maximumRetentionDays: 0 }),
      ]).maximumRetentionDays,
    ).toBe(0);
  });

  // PLAN constrains most and sits first, so a lower index is stricter — the
  // same direction as risk, so a reader learns one ordering.
  it('takes the strictest permission-mode floor, and an unset floor constrains nothing', () => {
    expect(
      intersectPolicies([
        policy({ minimumPermissionMode: 'AUTONOMOUS_SCOPED' }),
        policy({ minimumPermissionMode: 'ASK' }),
      ]).minimumPermissionMode,
    ).toBe('ASK');

    expect(
      intersectPolicies([
        policy({ minimumPermissionMode: null }),
        policy({ minimumPermissionMode: 'PLAN' }),
      ]).minimumPermissionMode,
    ).toBe('PLAN');

    expect(
      intersectPolicies([policy({ minimumPermissionMode: null }), policy()]).minimumPermissionMode,
    ).toBeNull();
  });

  // The property that matters: whatever the inputs, the result constrains at
  // least as much as each one of them.
  it('is never weaker than any single input', () => {
    const strict = policy({
      maximumRisk: 'R0',
      deniedEffects: ['elevation'],
      maximumRetentionDays: 1,
      minimumPermissionMode: 'PLAN',
      allowedTools: ['workspace.files'],
    });
    const permissive = policy();

    const combined = intersectPolicies([permissive, strict]);

    expect(combined.maximumRisk).toBe(strict.maximumRisk);
    expect(combined.deniedEffects).toEqual(expect.arrayContaining([...strict.deniedEffects]));
    expect(combined.maximumRetentionDays).toBe(strict.maximumRetentionDays);
    expect(combined.minimumPermissionMode).toBe(strict.minimumPermissionMode);
    expect(combined.allowedTools).toEqual([...strict.allowedTools]);
  });
});
