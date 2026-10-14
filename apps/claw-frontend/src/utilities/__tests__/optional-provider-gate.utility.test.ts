import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';
import {
  resetOptionalProvider,
  throughOptionalProvider,
} from '@/utilities/optional-provider-gate.utility';

const failure = (status: number): ApiClientError => new ApiClientError({ message: 'x', status });

describe('optional provider gate', () => {
  beforeEach(() => {
    resetOptionalProvider();
  });

  it.each([502, 503, 404])('stops asking after a %s until the gate is reset', async (status) => {
    const request = vi.fn().mockRejectedValue(failure(status));

    await expect(throughOptionalProvider('ollama', request)).rejects.toMatchObject({ status });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await expect(throughOptionalProvider('ollama', request)).rejects.toMatchObject({
        code: 'OPTIONAL_PROVIDER_UNAVAILABLE',
      });
    }
    expect(request).toHaveBeenCalledTimes(1);

    resetOptionalProvider('ollama');
    await expect(throughOptionalProvider('ollama', request)).rejects.toBeInstanceOf(ApiClientError);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps providers apart', async () => {
    const down = vi.fn().mockRejectedValue(failure(502));
    const up = vi.fn().mockResolvedValue('models');
    await expect(throughOptionalProvider('ollama', down)).rejects.toBeDefined();

    await expect(throughOptionalProvider('llamacpp', up)).resolves.toBe('models');
  });

  it('backs off exponentially after other failures, capped, and recovers on success', async () => {
    let clock = 1_000_000;
    const now = (): number => clock;
    const request = vi
      .fn()
      .mockRejectedValueOnce(failure(500))
      .mockRejectedValueOnce(failure(500))
      .mockResolvedValue('ok');

    await expect(throughOptionalProvider('ollama', request, now)).rejects.toBeDefined();
    await expect(throughOptionalProvider('ollama', request, now)).rejects.toMatchObject({
      code: 'OPTIONAL_PROVIDER_UNAVAILABLE',
    });
    expect(request).toHaveBeenCalledTimes(1);

    clock += 2_000;
    await expect(throughOptionalProvider('ollama', request, now)).rejects.toMatchObject({
      status: 500,
    });
    clock += 3_999;
    await expect(throughOptionalProvider('ollama', request, now)).rejects.toMatchObject({
      code: 'OPTIONAL_PROVIDER_UNAVAILABLE',
    });
    expect(request).toHaveBeenCalledTimes(2);

    clock += 1;
    await expect(throughOptionalProvider('ollama', request, now)).resolves.toBe('ok');
    await expect(throughOptionalProvider('ollama', request, now)).resolves.toBe('ok');
  });
});
