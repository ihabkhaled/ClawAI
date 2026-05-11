import { Injectable, Logger } from '@nestjs/common';
import { FeedbackSignal } from '../../../common/enums';
import {
  DEFAULT_SUCCESS_RATE,
  FALLBACK_TRIGGERED_DELTA,
  JUDGE_ESCALATED_DELTA,
  JUDGE_REVISED_DELTA,
  JUDGE_VERIFIED_DELTA,
  NEGATIVE_DELTA,
  POSITIVE_DELTA,
} from '../constants/learning-loop.constants';
import { LearnedScoreRepository } from '../repositories/learned-score.repository';
import {
  type LearnedScoreCounterField,
  type LearnedScoreRecord,
  type RecordFeedbackInput,
} from '../types/learning-loop.types';
import { boundedAdjust } from '../utilities/bounded-adjust.utility';

@Injectable()
export class LearningLoopManager {
  private readonly logger = new Logger(LearningLoopManager.name);

  constructor(private readonly repo: LearnedScoreRepository) {}

  async recordFeedback(input: RecordFeedbackInput): Promise<LearnedScoreRecord> {
    this.logger.debug(
      `recordFeedback profileKey=${input.profileKey} domain=${input.domain} signal=${input.signal}`,
    );
    const existing = await this.repo.findByKey(input.profileKey, input.domain, input.taskFamily);
    const currentRate = existing?.successRate ?? DEFAULT_SUCCESS_RATE;
    const delta = this.deltaFor(input.signal);
    const nextRate = boundedAdjust(currentRate, delta);
    const counterField = this.counterFor(input.signal);
    return this.repo.upsert({
      profileKey: input.profileKey,
      domain: input.domain,
      taskFamily: input.taskFamily,
      successRate: nextRate,
      counterField,
    });
  }

  async getRollingScore(
    profileKey: string,
    domain: RecordFeedbackInput['domain'],
    taskFamily: string,
  ): Promise<number> {
    const record = await this.repo.findByKey(profileKey, domain, taskFamily);
    return record?.successRate ?? DEFAULT_SUCCESS_RATE;
  }

  async listForProfile(profileKey: string): Promise<LearnedScoreRecord[]> {
    return this.repo.listForProfile(profileKey);
  }

  private deltaFor(signal: FeedbackSignal): number {
    switch (signal) {
      case FeedbackSignal.POSITIVE:
        return POSITIVE_DELTA;
      case FeedbackSignal.NEGATIVE:
        return NEGATIVE_DELTA;
      case FeedbackSignal.JUDGE_VERIFIED:
        return JUDGE_VERIFIED_DELTA;
      case FeedbackSignal.JUDGE_REVISED:
        return JUDGE_REVISED_DELTA;
      case FeedbackSignal.JUDGE_ESCALATED:
        return JUDGE_ESCALATED_DELTA;
      case FeedbackSignal.FALLBACK_TRIGGERED:
        return FALLBACK_TRIGGERED_DELTA;
    }
  }

  private counterFor(signal: FeedbackSignal): LearnedScoreCounterField {
    switch (signal) {
      case FeedbackSignal.POSITIVE:
        return 'feedbackPositive';
      case FeedbackSignal.NEGATIVE:
        return 'feedbackNegative';
      case FeedbackSignal.JUDGE_VERIFIED:
        return 'judgeVerified';
      case FeedbackSignal.JUDGE_REVISED:
        return 'judgeRevised';
      case FeedbackSignal.JUDGE_ESCALATED:
        return 'judgeEscalated';
      case FeedbackSignal.FALLBACK_TRIGGERED:
        return 'fallbackTriggered';
    }
  }
}
