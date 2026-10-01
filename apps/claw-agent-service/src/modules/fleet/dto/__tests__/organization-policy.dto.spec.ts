import { updateOrganizationPolicySchema } from '../organization-policy.dto';

describe('updateOrganizationPolicySchema: allowedPluginMarketplaces (F081)', () => {
  it('defaults to null (no opinion) so an older admin client changes nothing', () => {
    expect(updateOrganizationPolicySchema.parse({}).allowedPluginMarketplaces).toBeNull();
  });

  it('accepts a list, including the empty list that means none allowed', () => {
    expect(
      updateOrganizationPolicySchema.parse({ allowedPluginMarketplaces: [] })
        .allowedPluginMarketplaces,
    ).toEqual([]);
    expect(
      updateOrganizationPolicySchema.parse({ allowedPluginMarketplaces: ['https://m.example'] })
        .allowedPluginMarketplaces,
    ).toEqual(['https://m.example']);
  });

  it('rejects empty entries, oversized lists and non-arrays', () => {
    const parse = (value: unknown): boolean =>
      updateOrganizationPolicySchema.safeParse({ allowedPluginMarketplaces: value }).success;
    expect(parse([''])).toBe(false);
    expect(parse(Array.from({ length: 101 }, (_, i) => `m${i}`))).toBe(false);
    expect(parse('https://m.example')).toBe(false);
  });
});

describe('updateOrganizationPolicySchema: runner policy (F100)', () => {
  it('defaults to inert: off, no minimum, no platforms, no report requirement', () => {
    const parsed = updateOrganizationPolicySchema.parse({});
    expect(parsed.runnerPolicyMode).toBe('off');
    expect(parsed.minRunnerVersion).toBeNull();
    expect(parsed.allowedRunnerPlatforms).toBeNull();
    expect(parsed.requireVersionReport).toBe(false);
  });

  it('accepts a semver minimum, with or without a v prefix or prerelease', () => {
    for (const value of ['1.92.0', 'v1.92.0', '1.93.0-beta.1']) {
      expect(
        updateOrganizationPolicySchema.parse({ minRunnerVersion: value }).minRunnerVersion,
      ).toBe(value);
    }
  });

  it.each(['', 'latest', '1.2', '1.x.0', 'a'.repeat(60)])(
    'refuses a non-semver minimum %j',
    (value) => {
      expect(updateOrganizationPolicySchema.safeParse({ minRunnerVersion: value }).success).toBe(
        false,
      );
    },
  );

  it('accepts only known normalized platforms, and refuses win32 and the empty list', () => {
    expect(
      updateOrganizationPolicySchema.parse({ allowedRunnerPlatforms: ['linux', 'windows'] })
        .allowedRunnerPlatforms,
    ).toEqual(['linux', 'windows']);
    for (const bad of [['win32'], [], ['plan9'], 'linux']) {
      expect(
        updateOrganizationPolicySchema.safeParse({ allowedRunnerPlatforms: bad }).success,
      ).toBe(false);
    }
  });

  it('accepts the three modes and nothing else', () => {
    for (const mode of ['off', 'report', 'enforce']) {
      expect(
        updateOrganizationPolicySchema.parse({ runnerPolicyMode: mode }).runnerPolicyMode,
      ).toBe(mode);
    }
    expect(updateOrganizationPolicySchema.safeParse({ runnerPolicyMode: 'block' }).success).toBe(
      false,
    );
  });
});
