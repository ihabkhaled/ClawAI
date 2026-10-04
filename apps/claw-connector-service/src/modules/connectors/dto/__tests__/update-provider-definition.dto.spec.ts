import { updateProviderDefinitionSchema } from '../update-provider-definition.dto';

describe('updateProviderDefinitionSchema', () => {
  it('leaves every omitted field undefined so a partial update changes nothing else', () => {
    const result = updateProviderDefinitionSchema.safeParse({ displayName: 'Renamed' });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ displayName: 'Renamed' });
  });

  it('accepts the key header settings and a blank health path', () => {
    const result = updateProviderDefinitionSchema.safeParse({
      authHeaderName: 'apikey',
      authHeaderScheme: '',
      healthCheckEndpoint: '',
    });

    expect(result.success && result.data.authHeaderName).toBe('apikey');
  });
});
