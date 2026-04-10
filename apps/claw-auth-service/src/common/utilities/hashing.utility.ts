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
