import { describe, expect, it } from 'vitest';

import { readProviderDefinitionForm } from '@/utilities/provider-definition-form.utility';

const formOf = (entries: Record<string, string>, checked: string[] = []): FormData => {
  const form = new FormData();
  for (const [name, value] of Object.entries(entries)) {form.set(name, value);}
  for (const name of checked) {form.set(name, 'on');}
  return form;
};

describe('readProviderDefinitionForm', () => {
  it('reads every provider setting, including the key header and list format', () => {
    const data = readProviderDefinitionForm(
      formOf(
        {
          key: ' ai-horde ',
          displayName: 'AI Horde',
          defaultBaseUrl: 'https://aihorde.net/api',
          modelsEndpoint: '/v2/status/models?type=text',
          modelsResponseFormat: 'BARE_ARRAY',
          healthCheckEndpoint: '/v2/status/heartbeat',
          authType: 'API_KEY',
          authHeaderName: 'apikey',
          authHeaderScheme: '',
        },
        ['hasFreeTier'],
      ),
    );

    expect(data).toMatchObject({
      key: 'ai-horde',
      modelsResponseFormat: 'BARE_ARRAY',
      authHeaderName: 'apikey',
      authHeaderScheme: '',
      hasFreeTier: true,
      supportsNativeTools: false,
    });
  });

  it('falls back to the standard Bearer Authorization header and OpenAI list', () => {
    const data = readProviderDefinitionForm(formOf({ displayName: 'X' }));

    expect(data.authHeaderName).toBe('Authorization');
    expect(data.modelsResponseFormat).toBe('OPENAI_LIST');
  });
});
