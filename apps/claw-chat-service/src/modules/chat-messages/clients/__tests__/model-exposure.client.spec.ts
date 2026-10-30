import { ModelCostClass } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { costClassKey } from '../../utilities/model-cost-class-key.utility';
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
    expect(result.get(costClassKey('OPENAI', 'a'))).toBe(ModelCostClass.FREE);
    expect(result.get(costClassKey('OPENAI', 'b'))).toBeNull();
  });

  it('does not write what a caller asked about into the send gate cache', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      data: [{ provider: 'OPENAI', model: 'a', costClass: 'CHEAP' }],
    });

    await client.getCostClasses([pair('a')]);
    httpRequest.mockClear();
    httpRequest.mockResolvedValue({ ok: true, data: { costClass: 'PREMIUM', isPriced: true } });
    const gate = await client.getCostClass('OPENAI', 'a');

    // The gate asked routing itself; it did not inherit the picker's answer.
    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(gate).toBe(ModelCostClass.PREMIUM);
  });

  it('reads what the gate already cached, without calling routing for it', async () => {
    httpRequest.mockResolvedValue({ ok: true, data: { costClass: 'STANDARD', isPriced: true } });
    await client.getCostClass('OPENAI', 'a');
    httpRequest.mockClear();

    const result = await client.getCostClasses([pair('a')]);

    expect(httpRequest).not.toHaveBeenCalled();
    expect(result.get(costClassKey('OPENAI', 'a'))).toBe(ModelCostClass.STANDARD);
  });

  it('cannot be made to answer for a different model by a crafted provider name', async () => {
    // Provider `OPENROUTER/vendor` + model `x` must not look like provider `OPENROUTER` + model `vendor/x`.
    httpRequest.mockResolvedValue({
      ok: true,
      data: [{ provider: 'OPENROUTER/vendor', model: 'x', costClass: null }],
    });

    const crafted = await client.getCostClasses([{ provider: 'OPENROUTER/vendor', model: 'x' }]);
    expect(crafted.get(costClassKey('OPENROUTER/vendor', 'x'))).toBeNull();
    expect(crafted.has(costClassKey('OPENROUTER', 'vendor/x'))).toBe(false);

    httpRequest.mockClear();
    httpRequest.mockResolvedValue({ ok: true, data: { costClass: 'CHEAP', isPriced: true } });
    expect(await client.getCostClass('OPENROUTER', 'vendor/x')).toBe(ModelCostClass.CHEAP);
    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('ignores a row in the answer that was not asked for', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      data: [
        { provider: 'OPENAI', model: 'a', costClass: 'FREE' },
        { provider: 'OPENAI', model: 'planted', costClass: 'FREE' },
      ],
    });

    const result = await client.getCostClasses([pair('a')]);

    expect(result.has(costClassKey('OPENAI', 'planted'))).toBe(false);
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

    expect(result.has(costClassKey('OPENAI', 'a'))).toBe(false);
  });

  it('leaves a model out when routing answers with something unexpected', async () => {
    httpRequest.mockResolvedValue({ ok: true, data: { nope: true } });

    const result = await client.getCostClasses([pair('a')]);

    expect(result.has(costClassKey('OPENAI', 'a'))).toBe(false);
  });
});
