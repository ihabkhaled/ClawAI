import * as argon2 from 'argon2';
import { Logger } from '@nestjs/common';
import { ARGON2_MEMORY_COST, ARGON2_PARALLELISM, ARGON2_TIME_COST } from '../constants';

const logger = new Logger('HashingUtility');

export async function hashPassword(password: string): Promise<string> {
  logger.debug('hashPassword: starting password hash with argon2id');
  const startTime = Date.now();
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });
  const durationMs = Date.now() - startTime;
  logger.debug(`hashPassword: completed in ${String(durationMs)}ms`);
  return hash;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  logger.debug('verifyPassword: starting password verification');
  const startTime = Date.now();
  const result = await argon2.verify(hash, password);
  const durationMs = Date.now() - startTime;
  logger.debug(`verifyPassword: completed in ${String(durationMs)}ms — match=${String(result)}`);
  return result;
}

// A throwaway hash of a value nobody can supply, computed once per process and
// reused. It exists purely to give `burnPasswordVerification` something real to
// verify against — see that function for why.
let decoyHashPromise: Promise<string> | null = null;

/**
 * Spend the same argon2 work a real password check costs, and return false.
 *
 * Login must not answer faster for an email that does not exist than for one
 * that does. Without this, an attacker who cannot read our response bodies can
 * still enumerate accounts with a stopwatch: a miss would return in
 * milliseconds while a hit paid for a full argon2id verification. Calling this
 * on the unknown-email branch makes both branches cost the same.
 *
 * It never throws: a decoy verification failing is the expected outcome, and a
 * failure to even produce the decoy must not turn a bad login into a 500.
 */
export async function burnPasswordVerification(password: string): Promise<false> {
  try {
    decoyHashPromise ??= hashPassword(`decoy:${String(Date.now())}:${String(Math.random())}`);
    await argon2.verify(await decoyHashPromise, password);
  } catch {
    // Expected — the password never matches the decoy.
  }
  return false;
}
