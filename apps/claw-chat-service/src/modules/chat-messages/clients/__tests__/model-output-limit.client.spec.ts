import { vi } from 'vitest';

import type { ModelCapabilityClient } from '../model-capability.client';
import { ModelOutputLimitClient } from '../model-output-limit.client';

const { appConfigGet, httpRequest } = vi.hoisted(() => ({
  appConfigGet: vi.fn(),
  httpRequest: vi.fn(),
}));

vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
}));
vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

function build(catalog: number | undefined) {
  const capability = { resolveMaxOutputTokens: vi.fn().mockResolvedValue(catalog) };
  return {
    capability,
    client: new ModelOutputLimitClient(capability as unknown as ModelCapabilityClient),
  };
}

describe('ModelOutputLimitClient (ADR-125)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ModelOutputLimitClient.forgetAll();
    appConfigGet.mockReturnValue({ CONNECTOR_SERVICE_URL: 'http://connector:4011' });
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { updated: 1 } });
  });

  it('answers the catalog ceiling from the snapshot', async () => {
    const { client } = build(16_384);
    await expect(client.find('GROQ', 'qwen/qwen3.8-27b')).resolves.toBe(16_384);
  });

  it('a learned ceiling applies at once in this replica and is persisted', async () => {
    const { client } = build(undefined);
    await client.record('OLLAMA', 'kimi-k3', 16_384);
    await expect(client.find('OLLAMA', 'kimi-k3')).resolves.toBe(16_384);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://connector:4011/api/v1/internal/connectors/models/output-limit',
        method: 'POST',
        body: { provider: 'OLLAMA', model: 'kimi-k3', maxOutputTokens: 16_384 },
        headers: { Authorization: 'Service t' },
      }),
    );
  });

  it('the smaller of catalog and learned wins; learned only goes down', async () => {
    const { client } = build(8_192);
    await client.record('OPENAI', 'm', 16_384);
    await expect(client.find('OPENAI', 'm')).resolves.toBe(8_192);
    await client.record('OPENAI', 'm', 4_096);
    await client.record('OPENAI', 'm', 12_000);
    await expect(client.find('OPENAI', 'm')).resolves.toBe(4_096);
  });

  it('a failed persist never throws into the turn', async () => {
    httpRequest.mockRejectedValue(new Error('ECONNREFUSED'));
    const { client } = build(undefined);
    await expect(client.record('GROQ', 'm', 100)).resolves.toBeUndefined();
    await expect(client.find('GROQ', 'm')).resolves.toBe(100);
  });

  it('a failed snapshot read is unknown, not an error', async () => {
    const { client, capability } = build(undefined);
    capability.resolveMaxOutputTokens.mockRejectedValue(new Error('boom'));
    await expect(client.find('GROQ', 'x')).resolves.toBeUndefined();
  });
});
