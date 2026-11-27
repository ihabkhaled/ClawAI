import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { deriveScopedKey } from '../../../common/utilities/scoped-token.utility';
import {
  POW_CHALLENGE_TTL_MS,
  POW_CLAIM_MARGIN_SECONDS,
  POW_SALT_BYTES,
  POW_SIGNING_KEY_CONTEXT,
  POW_TOKEN_VERSION,
} from '../constants/anti-abuse.constants';
import { BotCheckReason } from '../enums/bot-check-reason.enum';
import { AntiAbuseCounterRepository } from '../repositories/anti-abuse-counter.repository';
import type { PowChallengeView, PowSolution } from '../types/bot-check.types';
import { powClaimKey } from '../utilities/anti-abuse-key.utility';
import { meetsDifficulty, readPowToken, signPowPayload } from '../utilities/proof-of-work.utility';

/**
 * The always-on bot check: a stateless, HMAC-signed puzzle.
 *
 * Issuing stores nothing (the token carries salt, difficulty and expiry under a
 * key derived from JWT_SECRET). Verifying is cheap and ordered so the only
 * Redis write is for a CORRECT answer: the salt is claimed with SET NX, which is
 * what makes a solved challenge single use.
 */
@Injectable()
export class ProofOfWorkService {
  private readonly logger = new Logger(ProofOfWorkService.name);

  constructor(private readonly counters: AntiAbuseCounterRepository) {}

  issue(difficulty: number, now: Date = new Date()): PowChallengeView {
    const salt = randomBytes(POW_SALT_BYTES).toString('hex');
    const exp = now.getTime() + POW_CHALLENGE_TTL_MS;
    const token = signPowPayload({ v: POW_TOKEN_VERSION, salt, difficulty, exp }, this.key());
    this.logger.debug(`issue: challenge at difficulty ${difficulty}`);
    return { token, salt, difficulty, expiresAt: new Date(exp).toISOString() };
  }

  /**
   * PASSED, or the first reason the answer is wrong. A token minted at a lower
   * difficulty than the one now in force is refused (an admin who raises the bar
   * raises it at once). Redis unreachable at the claim: allowed, logged.
   */
  async verify(
    solution: PowSolution,
    requiredDifficulty: number,
    now: Date = new Date(),
  ): Promise<BotCheckReason> {
    const reading = readPowToken(solution.token, this.key());
    if ('failure' in reading) {
      return reading.failure;
    }
    const { salt, difficulty, exp } = reading.payload;
    if (exp <= now.getTime()) {
      return BotCheckReason.POW_EXPIRED;
    }
    if (difficulty < requiredDifficulty) {
      return BotCheckReason.POW_WEAK_DIFFICULTY;
    }
    if (!meetsDifficulty(salt, solution.nonce, difficulty)) {
      return BotCheckReason.POW_WRONG_SOLUTION;
    }
    const ttlSeconds = Math.ceil((exp - now.getTime()) / 1000) + POW_CLAIM_MARGIN_SECONDS;
    const claimed = await this.counters.claimOnce(powClaimKey(salt), ttlSeconds);
    if (claimed === null) {
      this.logger.warn('verify: single-use claim unavailable; accepting a correct solution');
    }
    return claimed === false ? BotCheckReason.POW_REUSED : BotCheckReason.PASSED;
  }

  private key(): string {
    return deriveScopedKey(AppConfig.get().JWT_SECRET, POW_SIGNING_KEY_CONTEXT);
  }
}
