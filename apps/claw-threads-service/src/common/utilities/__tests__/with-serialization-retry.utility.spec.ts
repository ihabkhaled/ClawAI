import { ServiceUnavailableException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { isWriteConflict, withSerializationRetry } from '../with-serialization-retry.utility';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('withSerializationRetry', () => {
  it('returns the first result without waiting', async () => {
    const task = vi.fn().mockResolvedValue('ok');

    await expect(withSerializationRetry(task, 3, 1)).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('recognises only the two write-conflict codes', () => {
    expect(isWriteConflict(known('P2034'))).toBe(true);
    expect(isWriteConflict(known('P2002'))).toBe(true);
    expect(isWriteConflict(known('P2025'))).toBe(false);
    expect(isWriteConflict(new Error('P2034'))).toBe(false);
    expect(isWriteConflict('P2034')).toBe(false);
  });

  it('retries a conflict and stops at the first success', async () => {
    const task = vi.fn().mockRejectedValueOnce(known('P2034')).mockResolvedValueOnce('done');

    await expect(withSerializationRetry(task, 3, 1)).resolves.toBe('done');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('turns exhausted conflicts into a 503, with exactly the allowed attempts', async () => {
    const task = vi.fn().mockRejectedValue(known('P2034'));

    await expect(withSerializationRetry(task, 3, 1)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('throws any other error at once', async () => {
    const task = vi.fn().mockRejectedValue(known('P2025'));

    await expect(withSerializationRetry(task, 3, 1)).rejects.toMatchObject({ code: 'P2025' });
    expect(task).toHaveBeenCalledTimes(1);
  });
});
