import { vi } from 'vitest';

import { ModelUnavailableClient } from '../model-unavailable.client';

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

describe('ModelUnavailableClient (ADR-151)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({ CONNECTOR_SERVICE_URL: 'http://connector:4011' });
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { updated: 1 } });
  });

  it('reports the model to connector-service with the service token', async () => {
    await new ModelUnavailableClient().record('OPENAI', 'gpt-5-chat-latest');
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://connector:4011/api/v1/internal/connectors/models/unavailable',
        method: 'POST',
        body: { provider: 'OPENAI', model: 'gpt-5-chat-latest' },
        headers: { Authorization: 'Service t' },
      }),
    );
  });

  it('never throws when the report fails', async () => {
    httpRequest.mockRejectedValue(new Error('connector down'));
    await expect(new ModelUnavailableClient().record('OPENAI', 'x')).resolves.toBeUndefined();
  });
});
