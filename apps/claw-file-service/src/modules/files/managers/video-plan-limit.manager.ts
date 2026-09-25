import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  EntitlementsAdapter,
  resolvePlanLimit,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import { VideoPlanDecision } from '../../../common/enums';
import { type VideoPlanCheck } from '../types/video-processing.types';

/**
 * The uploader's plan limit for one video (ADR-122, `Plan.maxVideoSeconds`).
 *
 * file-service EXECUTES the paid step (the audio-track transcription), so it
 * is the service that refuses. `null` is unlimited (and every ADMIN, through
 * `resolvePlanLimit`); `0` is "video disabled"; anything else is a ceiling in
 * whole seconds, compared against the MEASURED duration.
 *
 * Fails CLOSED for the paid step: when auth-service cannot answer — down, a
 * stated refusal, or an older build that omits the field — the decision is
 * `ENTITLEMENTS_UNAVAILABLE` and the caller skips transcription. The free,
 * local steps (probe, thumbnail) still run.
 */
@Injectable()
export class VideoPlanLimitManager {
  private readonly logger = new Logger(VideoPlanLimitManager.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter) {}

  async check(userId: string, durationMs: number): Promise<VideoPlanCheck> {
    const ent = await this.resolve(userId);
    if (ent === null) {
      return { decision: VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE, limitSeconds: null };
    }
    const limit = resolvePlanLimit(ent, (limits) => limits.maxVideoSeconds);
    return this.decide(userId, durationMs, limit);
  }

  private decide(
    userId: string,
    durationMs: number,
    limit: number | null | undefined,
  ): VideoPlanCheck {
    if (limit === null) {
      return { decision: VideoPlanDecision.ALLOWED, limitSeconds: null };
    }
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0) {
      this.logger.warn(
        `check: user=${userId} plan limit unreadable (${String(limit)}) — failing closed`,
      );
      return { decision: VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE, limitSeconds: null };
    }
    if (limit === 0) {
      this.logger.log(`check: user=${userId} video disabled for plan`);
      return { decision: VideoPlanDecision.DISABLED, limitSeconds: 0 };
    }
    if (durationMs > limit * 1000) {
      this.logger.log(
        `check: user=${userId} durationMs=${String(durationMs)} over plan limit ${String(limit)}s`,
      );
      return { decision: VideoPlanDecision.TOO_LONG, limitSeconds: limit };
    }
    return { decision: VideoPlanDecision.ALLOWED, limitSeconds: limit };
  }

  private async resolve(userId: string): Promise<UserEntitlements | null> {
    try {
      return await this.entitlements.getEntitlements(userId);
    } catch (error: unknown) {
      this.logger.error(
        `check: entitlements unavailable user=${userId} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
