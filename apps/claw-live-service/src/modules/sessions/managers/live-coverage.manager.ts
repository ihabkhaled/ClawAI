import { Injectable } from '@nestjs/common';

import { LiveCoverageAction } from '../../../common/enums/live-coverage-action.enum';
import type { LiveViewerSession } from '../../../generated/prisma';
import type { HeartbeatBody } from '../dto/live-session.dto';
import { LiveCoverageRepository } from '../repositories/live-coverage.repository';
import { decideCoverage, endsInGap } from '../utilities/live-coverage.utility';

/**
 * Writes LiveSessionCoverage from heartbeats while AI is active (architecture
 * doc section 5): extend while playback is continuous, close and reopen on a
 * jump, flag the closed interval as ending in a GAP when the viewer returned to
 * the Live Edge after the paused point left the DVR window.
 */
@Injectable()
export class LiveCoverageManager {
  constructor(private readonly coverage: LiveCoverageRepository) {}

  async record(before: LiveViewerSession, body: HeartbeatBody, now: number): Promise<void> {
    if (before.runId === null) return;
    const latest = await this.coverage.latest(before.id, before.runId);
    const lastHeartbeatAt = before.lastHeartbeatAt?.getTime() ?? now;
    const action = decideCoverage({
      latestToAt: latest ? Number(latest.toAt) : null,
      playbackAt: body.playbackAt,
      elapsedMs: now - lastHeartbeatAt,
    });
    const playbackAt = BigInt(body.playbackAt);
    if (action === LiveCoverageAction.EXTEND && latest) {
      if (playbackAt > latest.toAt) await this.coverage.extend(latest.id, playbackAt);
      return;
    }
    const gap =
      latest !== null &&
      endsInGap({
        atLiveEdge: body.atLiveEdge,
        seekableFromAt: body.seekableFromAt,
        lastPlaybackAt: before.lastPlaybackAt === null ? null : Number(before.lastPlaybackAt),
      });
    if (latest && gap) await this.coverage.markGap(latest.id);
    await this.coverage.open(before.id, before.runId, playbackAt);
  }
}
