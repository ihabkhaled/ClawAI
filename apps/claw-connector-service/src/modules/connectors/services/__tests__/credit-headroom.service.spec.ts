import { vi } from 'vitest';

import { CreditHeadroomManager } from '../../managers/credit-headroom.manager';
import type { ConnectorsManager } from '../../managers/connectors.manager';
import type { ConnectorsRepository } from '../../repositories/connectors.repository';
import { CreditHeadroomService } from '../credit-headroom.service';

const { getCreditHeadroom } = vi.hoisted(() => ({ getCreditHeadroom: vi.fn() }));
vi.mock('../../managers/adapters/adapter-factory', () => ({
  getAdapter: vi.fn(() => ({ getCreditHeadroom })),
}));

const connector = { id: 'conn-1', provider: 'OPENROUTER' };

function build(found: unknown = connector, configThrows = false) {
  const repository = { findByProvider: vi.fn().mockResolvedValue(found) };
  const manager = {
    getExecutionConfig: vi.fn(() => {
      if (configThrows) {
        throw new Error('cannot decrypt');
      }
      return { provider: 'OPENROUTER', apiKey: 'k', baseUrl: 'https://openrouter.ai/api/v1' };
    }),
  };
  return new CreditHeadroomService(
    repository as unknown as ConnectorsRepository,
    manager as unknown as ConnectorsManager,
    new CreditHeadroomManager(),
  );
}

describe('CreditHeadroomService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    getCreditHeadroom.mockResolvedValue({ known: true, remainingMicroUsd: 21_300 });
  });

  it('reads the connector key balance through its adapter', async () => {
    await expect(build().getCreditHeadroom('OPENROUTER')).resolves.toEqual({
      known: true,
      remainingMicroUsd: 21_300,
    });
    expect(getCreditHeadroom).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'k', baseUrl: 'https://openrouter.ai/api/v1' }),
    );
  });

  it('caches per connector for 60 s, then reads again', async () => {
    vi.useFakeTimers();
    const service = build();
    await service.getCreditHeadroom('OPENROUTER');
    await service.getCreditHeadroom('OPENROUTER');
    expect(getCreditHeadroom).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    await service.getCreditHeadroom('OPENROUTER');
    expect(getCreditHeadroom).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight read between concurrent callers', async () => {
    const service = build();
    await Promise.all([
      service.getCreditHeadroom('OPENROUTER'),
      service.getCreditHeadroom('OPENROUTER'),
      service.getCreditHeadroom('OPENROUTER'),
    ]);
    expect(getCreditHeadroom).toHaveBeenCalledTimes(1);
  });

  it('is unknown for a provider with no connector', async () => {
    await expect(build(null).getCreditHeadroom('NOPE')).resolves.toEqual({
      known: false,
      remainingMicroUsd: null,
    });
    expect(getCreditHeadroom).not.toHaveBeenCalled();
  });

  it('is unknown, not an error, when the connector config cannot be built', async () => {
    await expect(build(connector, true).getCreditHeadroom('OPENROUTER')).resolves.toEqual({
      known: false,
      remainingMicroUsd: null,
    });
  });

  it('is unknown when the adapter read rejects', async () => {
    getCreditHeadroom.mockRejectedValueOnce(new Error('boom'));
    await expect(build().getCreditHeadroom('OPENROUTER')).resolves.toEqual({
      known: false,
      remainingMicroUsd: null,
    });
  });
});
