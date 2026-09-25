import { vi } from 'vitest';

import { ProviderCreditHeadroomClient } from '../provider-credit-headroom.client';

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

const PRICED = {
  inputPerMillionMicroUsd: 600_000,
  outputPerMillionMicroUsd: 2_200_000,
  cachedInputPerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  isPriced: true,
  isFallbackRate: false,
};

function route(headroom: unknown, rate: unknown = PRICED): void {
  httpRequest.mockImplementation(async (args: { url: string }) => {
    if (args.url.includes('/internal/connectors/credit-headroom')) {
      return headroom instanceof Error
        ? Promise.reject(headroom)
        : { ok: true, status: 200, data: headroom };
    }
    if (args.url.includes('/internal/router-models/costs/')) {
      return { ok: true, status: 200, data: rate };
    }
    throw new Error(`unrouted ${args.url}`);
  });
}

describe('ProviderCreditHeadroomClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProviderCreditHeadroomClient.invalidateAll();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      ROUTING_SERVICE_URL: 'http://routing:4004',
    });
  });

  it('makes NO call for a provider whose preset declares no credit endpoint', async () => {
    const client = new ProviderCreditHeadroomClient();
    await expect(client.affordableOutputTokens('OPENAI', 'gpt-5', 1_000)).resolves.toBeUndefined();
    await expect(client.affordableOutputTokens('GROQ', 'llama', 1_000)).resolves.toBeUndefined();
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('computes the affordable output for OpenRouter from key credit and the rate card', async () => {
    route({ known: true, remainingMicroUsd: 20_000 });
    const client = new ProviderCreditHeadroomClient();
    await expect(client.affordableOutputTokens('OPENROUTER', 'z-ai/glm-5.3', 1_000)).resolves.toBe(
      7_936,
    );
    const urls = httpRequest.mock.calls.map((call) => (call[0] as { url: string }).url);
    expect(urls[0]).toBe(
      'http://connector:4011/api/v1/internal/connectors/credit-headroom?provider=OPENROUTER',
    );
    expect(urls[1]).toBe(
      'http://routing:4004/api/v1/internal/router-models/costs/OPENROUTER/z-ai%2Fglm-5.3',
    );
    const headers = (httpRequest.mock.calls[0]?.[0] as { headers: Record<string, string> }).headers;
    expect(headers['Authorization']).toBe('Service t');
  });

  it('an unlimited or unknown key means no cap — and no rate lookup', async () => {
    route({ known: true, remainingMicroUsd: null });
    const client = new ProviderCreditHeadroomClient();
    await expect(client.affordableOutputTokens('OPENROUTER', 'm', 10)).resolves.toBeUndefined();
    route({ known: false, remainingMicroUsd: null });
    await expect(client.affordableOutputTokens('OPENROUTER', 'm', 10)).resolves.toBeUndefined();
    const rateCalls = httpRequest.mock.calls.filter((call) =>
      (call[0] as { url: string }).url.includes('/costs/'),
    );
    expect(rateCalls).toHaveLength(0);
  });

  it('fails open when connector-service is unreachable or answers garbage', async () => {
    route(new Error('ECONNREFUSED'));
    const client = new ProviderCreditHeadroomClient();
    await expect(client.affordableOutputTokens('OPENROUTER', 'm', 10)).resolves.toBeUndefined();
    route({ known: 'yes' });
    await expect(client.affordableOutputTokens('OPENROUTER', 'm', 10)).resolves.toBeUndefined();
  });

  it('no cap without a real price: unpriced, fallback-rate, or no output price', async () => {
    const client = new ProviderCreditHeadroomClient();
    route({ known: true, remainingMicroUsd: 20_000 }, { ...PRICED, isPriced: false });
    await expect(client.affordableOutputTokens('OPENROUTER', 'a', 10)).resolves.toBeUndefined();
    route({ known: true, remainingMicroUsd: 20_000 }, { ...PRICED, isFallbackRate: true });
    await expect(client.affordableOutputTokens('OPENROUTER', 'b', 10)).resolves.toBeUndefined();
    route(
      { known: true, remainingMicroUsd: 20_000 },
      { ...PRICED, outputPerMillionMicroUsd: null },
    );
    await expect(client.affordableOutputTokens('OPENROUTER', 'c', 10)).resolves.toBeUndefined();
  });

  it('returns 0 when the key cannot even pay for the prompt', async () => {
    route({ known: true, remainingMicroUsd: 100 });
    const client = new ProviderCreditHeadroomClient();
    await expect(client.affordableOutputTokens('OPENROUTER', 'm', 1_000)).resolves.toBe(0);
  });

  it('caches a model rate across calls', async () => {
    route({ known: true, remainingMicroUsd: 20_000 });
    const client = new ProviderCreditHeadroomClient();
    await client.affordableOutputTokens('OPENROUTER', 'm', 10);
    await client.affordableOutputTokens('OPENROUTER', 'm', 10);
    const rateCalls = httpRequest.mock.calls.filter((call) =>
      (call[0] as { url: string }).url.includes('/costs/'),
    );
    expect(rateCalls).toHaveLength(1);
  });
});
