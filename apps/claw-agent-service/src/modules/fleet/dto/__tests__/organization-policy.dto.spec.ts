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
