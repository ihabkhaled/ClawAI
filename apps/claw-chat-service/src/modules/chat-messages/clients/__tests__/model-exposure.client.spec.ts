import { ModelCostClass } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelExposureClient } from '../model-exposure.client';

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

const pair = (model: string): { provider: string; model: string } => ({
  provider: 'OPENAI',
  model,
});

describe('ModelExposureClient.getCostClasses', () => {
  const client = new ModelExposureClient();

  beforeEach(() => {
    vi.clearAllMocks();
    ModelExposureClient.invalidateAll();
    appConfigGet.mockReturnValue({ ROUTING_SERVICE_URL: 'https://routing:4003' });
  });

  it('asks routing once for a short list and keys the answer by provider/model', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      data: [
        { provider: 'OPENAI', model: 'a', costClass: 'FREE' },
        { provider: 'OPENAI', model: 'b', costClass: null },
      ],
    });

    const result = await client.getCostClasses([pair('a'), pair('b')]);

    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(result.get('OPENAI/a')).toBe(ModelCostClass.FREE);
    expect(result.get('OPENAI/b')).toBeNull();
  });

  it('serves a repeat from the cache without calling routing again', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      data: [{ provider: 'OPENAI', model: 'a', costClass: 'CHEAP' }],
    });

    await client.getCostClasses([pair('a')]);
    const second = await client.getCostClasses([pair('a')]);

    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(second.get('OPENAI/a')).toBe(ModelCostClass.CHEAP);
  });

  it('splits a long list into requests of at most 300 models', async () => {
    httpRequest.mockImplementation((request: { body: { models: Array<{ model: string }> } }) =>
      Promise.resolve({
        ok: true,
        data: request.body.models.map((entry) => ({
          provider: 'OPENAI',
          model: entry.model,
          costClass: 'STANDARD',
        })),
      }),
    );
    const models = Array.from({ length: 650 }, (_, index) => pair(`m-${String(index)}`));

    const result = await client.getCostClasses(models);

    expect(httpRequest).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(650);
  });

  it('leaves a model out, rather than guessing, when routing fails', async () => {
    httpRequest.mockRejectedValue(new Error('down'));

    const result = await client.getCostClasses([pair('a')]);

    expect(result.has('OPENAI/a')).toBe(false);
  });

  it('leaves a model out when routing answers with something unexpected', async () => {
    httpRequest.mockResolvedValue({ ok: true, data: { nope: true } });

    const result = await client.getCostClasses([pair('a')]);

    expect(result.has('OPENAI/a')).toBe(false);
  });
});
