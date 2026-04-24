import { createHash } from 'node:crypto';
import type { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

/**
 * Postgres advisory-lock helper used by the scheduler to guarantee only one
 * replica fires ticks at any given cron boundary.
 *
 * `pg_try_advisory_lock` returns `true` if the lock is acquired, `false` if
 * another session already holds it. The lock is auto-released on disconnect.
 *
 * The key is a signed 64-bit integer derived from a deterministic hash of the
 * provided namespace string.
 */
export function hashAdvisoryKey(namespace: string): bigint {
  const digest = createHash('sha256').update(namespace).digest();
  // Take the first 8 bytes as a signed 64-bit BigInt (Postgres advisory locks
  // accept bigint). Force into the signed range by zeroing the MSB.
  const unsigned = digest.readBigUInt64BE(0);
  const mask = BigInt('0x7fffffffffffffff');
  return unsigned & mask;
}

export async function tryAcquireAdvisoryLock(
  prisma: PrismaService,
  namespace: string,
): Promise<boolean> {
  const key = hashAdvisoryKey(namespace);
  const rows = await prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
    `SELECT pg_try_advisory_lock(${key.toString()}) AS locked`,
  );
  return rows[0]?.locked ?? false;
}

export async function releaseAdvisoryLock(
  prisma: PrismaService,
  namespace: string,
): Promise<boolean> {
  const key = hashAdvisoryKey(namespace);
  const rows = await prisma.$queryRawUnsafe<Array<{ released: boolean }>>(
    `SELECT pg_advisory_unlock(${key.toString()}) AS released`,
  );
  return rows[0]?.released ?? false;
}
