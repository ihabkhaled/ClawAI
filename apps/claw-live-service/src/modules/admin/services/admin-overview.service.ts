import { Injectable, NotFoundException } from '@nestjs/common';

import { LiveRunStatus } from '../../../generated/prisma';
import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { MS_PER_DAY, STOPPABLE_RUN_STATUSES } from '../constants/admin.constants';
import { AdminOverviewRepository } from '../repositories/admin-overview.repository';
import type { AdminOverviewView, RunStopView } from '../types/admin.types';
import {
  buildAiStats,
  buildMoney,
  startOfUtcDay,
  toActiveRunView,
} from '../utilities/admin-overview.utility';

@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly repository: AdminOverviewRepository,
    private readonly policy: LivePolicyService,
  ) {}

  async overview(days: number): Promise<AdminOverviewView> {
    const nowMs = Date.now();
    const since = new Date(nowMs - days * MS_PER_DAY);
    const [runs, activeViewers, runsFailed, delayedRuns, stages, uncertain, money, active] =
      await Promise.all([
        this.repository.listActiveRuns(),
        this.repository.countActiveViewers(),
        this.repository.countFailedSince(since),
        this.repository.countDelayed(),
        this.repository.stageStats(since),
        this.repository.countUncertainSince(since),
        this.repository.moneyAggregates(since, startOfUtcDay(nowMs)),
        this.policy.active(),
      ]);
    const viewers = await this.repository.viewersByRun(runs.map((run) => run.id));
    return {
      windowDays: days,
      activeRuns: runs.map((run) => toActiveRunView(run, viewers.get(run.id) ?? 0, nowMs)),
      totals: { activeRuns: runs.length, activeViewers, runsFailed, delayedRuns },
      ai: buildAiStats(stages, uncertain),
      money: buildMoney(money, days, active.config.dailyBudgetMicroUsd),
    };
  }

  /** Emergency stop: the worker ends at its next chunk boundary. Idempotent for a run already stopping. */
  async stopRun(runId: string): Promise<RunStopView> {
    const run = await this.repository.findRun(runId);
    if (run === null) throw new NotFoundException(LiveHistoryErrorCode.RUN_NOT_FOUND);
    if (!STOPPABLE_RUN_STATUSES.includes(run.status)) return { runId, status: run.status };
    await this.repository.stopRun(runId);
    return { runId, status: LiveRunStatus.STOPPING };
  }
}
