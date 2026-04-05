import { describe, expect, it } from 'vitest';

import { ConnectorProvider } from '@/enums';
import { createConnectorSchema, updateConnectorSchema } from '@/lib/validation/connector.schema';

describe('createConnectorSchema', () => {
  const validInput = {
    name: 'My OpenAI Connector',
    provider: ConnectorProvider.OPENAI,
    authType: 'API_KEY' as const,
  };

  it('accepts valid minimal input', () => {
    const result = createConnectorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      apiKey: 'sk-test-key',
      baseUrl: 'https://api.example.com',
      region: 'us-east-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for baseUrl', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      baseUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      name: 'x'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      provider: 'INVALID_PROVIDER',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid provider');
    }
  });

  it('rejects invalid auth type', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      authType: 'invalid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid auth type');
    }
  });

  it('rejects invalid URL for baseUrl', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      baseUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects apiKey exceeding 500 characters', () => {
    const result = createConnectorSchema.safeParse({
      ...validInput,
      apiKey: 'k'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid provider enum values', () => {
    for (const provider of Object.values(ConnectorProvider)) {
      const result = createConnectorSchema.safeParse({
        ...validInput,
        provider,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid auth type values', () => {
    const authTypes = ['API_KEY', 'OAUTH2', 'NONE'] as const;
    for (const authType of authTypes) {
      const result = createConnectorSchema.safeParse({
        ...validInput,
        authType,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateConnectorSchema', () => {
  it('accepts a partial update with only name', () => {
    const result = updateConnectorSchema.safeParse({ name: 'Updated name' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty object (no fields provided)', () => {
    const result = updateConnectorSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('At least one field must be provided');
    }
  });

  it('still validates individual field constraints', () => {
    const result = updateConnectorSchema.safeParse({
      name: '', // min 1
    });
    expect(result.success).toBe(false);
  });
});
