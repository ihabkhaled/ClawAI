import { randomInt } from 'node:crypto';

import { ServiceUnavailableException } from '@nestjs/common';

import { RETRYABLE_PRISMA_CODES } from '../constants/write-conflict.constants';
import { Prisma } from '../../generated/prisma';

export function isWriteConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_PRISMA_CODES.includes(error.code)
  );
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Runs a Serializable transaction again when it lost a write conflict, up to `attempts` times
 * with a short growing wait. Anything else is thrown at once. When every attempt conflicted the
 * caller gets a 503 it can retry, never a 500.
 */
export async function withSerializationRetry<T>(
  task: () => Promise<T>,
  attempts: number,
  baseDelayMs: number,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error: unknown) {
      if (!isWriteConflict(error)) throw error;
      if (attempt >= attempts) {
        throw new ServiceUnavailableException('The request collided with another one. Try again.');
      }
      await pause(baseDelayMs * 2 ** (attempt - 1) + randomInt(0, baseDelayMs + 1));
    }
  }
}
