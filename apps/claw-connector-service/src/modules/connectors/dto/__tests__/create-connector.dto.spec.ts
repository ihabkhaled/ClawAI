import { createConnectorSchema } from '../create-connector.dto';
import { ConnectorProvider, ConnectorAuthType } from '../../../../generated/prisma';

describe('createConnectorSchema', () => {
  it('should validate a correct connector payload with all fields', () => {
    const result = createConnectorSchema.safeParse({
      name: 'My OpenAI Connector',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
      apiKey: 'sk-test-key-123',
      baseUrl: 'https://api.openai.com',
      region: 'us-east-1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My OpenAI Connector');
      expect(result.data.provider).toBe(ConnectorProvider.OPENAI);
      expect(result.data.authType).toBe(ConnectorAuthType.API_KEY);
      expect(result.data.apiKey).toBe('sk-test-key-123');
      expect(result.data.baseUrl).toBe('https://api.openai.com');
      expect(result.data.region).toBe('us-east-1');
    }
  });

  it('should validate a minimal connector payload (required fields only)', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Ollama Local',
      provider: ConnectorProvider.OLLAMA,
      authType: ConnectorAuthType.NONE,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKey).toBeUndefined();
      expect(result.data.baseUrl).toBeUndefined();
      expect(result.data.region).toBeUndefined();
    }
  });

  it('should accept all valid providers', () => {
    const providers = [
      ConnectorProvider.OPENAI,
      ConnectorProvider.ANTHROPIC,
      ConnectorProvider.GEMINI,
      ConnectorProvider.AWS_BEDROCK,
      ConnectorProvider.DEEPSEEK,
      ConnectorProvider.OLLAMA,
    ];

    for (const provider of providers) {
      const result = createConnectorSchema.safeParse({
        name: 'Test',
        provider,
        authType: ConnectorAuthType.API_KEY,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid auth types', () => {
    const authTypes = [ConnectorAuthType.API_KEY, ConnectorAuthType.OAUTH2, ConnectorAuthType.NONE];

    for (const authType of authTypes) {
      const result = createConnectorSchema.safeParse({
        name: 'Test',
        provider: ConnectorProvider.OPENAI,
        authType,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing name', () => {
    const result = createConnectorSchema.safeParse({
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createConnectorSchema.safeParse({
      name: '',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 100 characters', () => {
    const result = createConnectorSchema.safeParse({
      name: 'a'.repeat(101),
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('should accept name at exactly 100 characters', () => {
    const result = createConnectorSchema.safeParse({
      name: 'a'.repeat(100),
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing provider', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid provider', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: 'INVALID_PROVIDER',
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing authType', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: ConnectorProvider.OPENAI,
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid authType', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: ConnectorProvider.OPENAI,
      authType: 'INVALID_AUTH',
    });

    expect(result.success).toBe(false);
  });

  it('should reject apiKey exceeding 500 characters', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
      apiKey: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('should reject baseUrl exceeding 500 characters', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
      baseUrl: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('should reject region exceeding 50 characters', () => {
    const result = createConnectorSchema.safeParse({
      name: 'Test',
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
      region: 'a'.repeat(51),
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty object', () => {
    const result = createConnectorSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject non-string name', () => {
    const result = createConnectorSchema.safeParse({
      name: 123,
      provider: ConnectorProvider.OPENAI,
      authType: ConnectorAuthType.API_KEY,
    });

    expect(result.success).toBe(false);
  });
});
