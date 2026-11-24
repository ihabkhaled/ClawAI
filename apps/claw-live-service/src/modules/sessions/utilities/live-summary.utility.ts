import { UnprocessableEntityException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import {
  LiveCapability,
  type LiveSessionState,
  type LiveViewerSession,
} from '../../../generated/prisma';
import { SUMMARY_ACCESS_SCOPE_PREFIX } from '../../sources/constants/sources.constants';
import type { SourceResolution } from '../../sources/types/source-resolution.types';
import { LIVE_ACCRUING_STATES } from '../constants/live-session.constants';
import type { LiveRunAccrualView } from '../types/live-session.types';

/**
 * A one-click "Summarize video" (ADR-221 batch 6) reads a RECORDED video only, on a stream scoped
 * `SUMMARY:<userId>`: its own fast run, apart from the viewer's play-along run of the same video.
 */
export function summaryResolution(resolution: SourceResolution, userId: string): SourceResolution {
  if (resolution.capability !== LiveCapability.RECORDED) {
    throw new UnprocessableEntityException(LiveSourceErrorCode.SUMMARY_NEEDS_RECORDED);
  }
  return { ...resolution, accessScope: `${SUMMARY_ACCESS_SCOPE_PREFIX}${userId}` };
}

/**
 * What a summary session's heartbeat accrues: the media seconds its run transcribed since the last
 * accrual (owner decision: the video's length counts as Live minutes). Null for every other session,
 * and while the session is not billable (waiting for credits: its run does not advance either).
 */
export function summaryMediaAccrual(
  session: Pick<LiveViewerSession, 'summary' | 'accruedMediaSeconds'>,
  run: Pick<LiveRunAccrualView, 'processedMediaSeconds'> | null,
  state: LiveSessionState,
): { from: number; to: number } | null {
  if (!session.summary || run === null || !LIVE_ACCRUING_STATES.includes(state)) return null;
  const to = Math.max(session.accruedMediaSeconds, run.processedMediaSeconds);
  return to > session.accruedMediaSeconds ? { from: session.accruedMediaSeconds, to } : null;
}
