import { describe, expect, it } from 'vitest';
import { ConnectorAuthType, ProviderAdapterFamily } from '../../../../generated/prisma';
import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { createProviderDefinitionSchema } from '../create-provider-definition.dto';

const validDefinition = {
  key: ' nvidia_nim ',
  displayName: 'NVIDIA NIM',
  description: 'NVIDIA hosted inference',
  adapterFamily: ProviderAdapterFamily.OPENAI_COMPATIBLE,
  defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
  modelsEndpoint: '/models',
  modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
  healthCheckEndpoint: '/models',
  authType: ConnectorAuthType.API_KEY,
  supportsNativeTools: true,
  supportsVision: false,
  registerUrl: 'https://build.nvidia.com/',
  apiKeyUrl: 'https://build.nvidia.com/',
  pricingUrl: 'https://build.nvidia.com/',
  docsUrl: 'https://docs.api.nvidia.com/nim/reference/llm-apis',
  defaultIsPayAsYouGo: false,
  hasFreeTier: false,
};

describe('createProviderDefinitionSchema', () => {
  it('normalizes a valid compatible provider key', () => {
    const result = createProviderDefinitionSchema.safeParse(validDefinition);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('NVIDIA_NIM');
    }
  });

  it('rejects unsupported adapter families and absolute discovery endpoints', () => {
    expect(
      createProviderDefinitionSchema.safeParse({
        ...validDefinition,
        adapterFamily: 'EXECUTABLE_PLUGIN',
      }).success,
    ).toBe(false);
    expect(
      createProviderDefinitionSchema.safeParse({
        ...validDefinition,
        modelsEndpoint: 'https://attacker.example/models',
      }).success,
    ).toBe(false);
  });

  it('rejects non-HTTPS, local and metadata destinations', () => {
    for (const defaultBaseUrl of [
      'http://provider.example/v1',
      'https://localhost/v1',
      'https://127.0.0.1/v1',
      'https://169.254.169.254/latest/meta-data',
      'https://user:password@provider.example/v1',
    ]) {
      expect(
        createProviderDefinitionSchema.safeParse({ ...validDefinition, defaultBaseUrl }).success,
      ).toBe(false);
    }
  });

  it('rejects unknown fields and oversized values', () => {
    expect(
      createProviderDefinitionSchema.safeParse({ ...validDefinition, arbitraryHeaders: {} })
        .success,
    ).toBe(false);
    expect(
      createProviderDefinitionSchema.safeParse({
        ...validDefinition,
        displayName: 'x'.repeat(256),
      }).success,
    ).toBe(false);
  });

  it('accepts hyphenated and spaced keys and stores them with underscores', () => {
    const hyphen = createProviderDefinitionSchema.safeParse({
      ...validDefinition,
      key: 'ai-horde',
    });
    const spaced = createProviderDefinitionSchema.safeParse({
      ...validDefinition,
      key: 'Hugging Face',
    });

    expect(hyphen.success && hyphen.data.key).toBe('AI_HORDE');
    expect(spaced.success && spaced.data.key).toBe('HUGGING_FACE');
  });

  it('defaults the key header to Authorization: Bearer and accepts a raw apikey header', () => {
    const defaults = createProviderDefinitionSchema.safeParse(validDefinition);
    const horde = createProviderDefinitionSchema.safeParse({
      ...validDefinition,
      authHeaderName: 'apikey',
      authHeaderScheme: '',
      healthCheckEndpoint: '',
    });

    expect(
      defaults.success && [defaults.data.authHeaderName, defaults.data.authHeaderScheme],
    ).toEqual(['Authorization', 'Bearer']);
    expect(horde.success && horde.data.authHeaderScheme).toBe('');
  });
});
