import { Test, type TestingModule } from '@nestjs/testing';
import { FeedbackSignal } from '../../../common/enums';
import { DomainTag } from '../../../generated/prisma';
import { DEFAULT_SUCCESS_RATE, SUCCESS_RATE_FLOOR } from '../constants/learning-loop.constants';
import { LearningLoopManager } from '../managers/learning-loop.manager';
import { LearnedScoreRepository } from '../repositories/learned-score.repository';
import { type LearnedScoreRecord } from '../types/learning-loop.types';

function makeRecord(overrides: Partial<LearnedScoreRecord> = {}): LearnedScoreRecord {
  return {
    id: 'r1',
    profileKey: 'OPENAI:gpt-4o',
    domain: DomainTag.CODING,
    taskFamily: 'coding-direct',
    successRate: 0.6,
    feedbackPositive: 0,
    feedbackNegative: 0,
    judgeVerified: 0,
    judgeRevised: 0,
    judgeEscalated: 0,
    fallbackTriggered: 0,
    totalRoutes: 0,
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('LearningLoopManager', () => {
  let manager: LearningLoopManager;
  let repo: jest.Mocked<LearnedScoreRepository>;

  beforeEach(async () => {
    repo = {
      findByKey: jest.fn(),
      upsert: jest.fn(),
      listForProfile: jest.fn(),
    } as unknown as jest.Mocked<LearnedScoreRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [LearningLoopManager, { provide: LearnedScoreRepository, useValue: repo }],
    }).compile();

    manager = module.get<LearningLoopManager>(LearningLoopManager);
  });

  describe('recordFeedback', () => {
    it('POSITIVE on fresh profile starts at DEFAULT + delta and counters', async () => {
      repo.findByKey.mockResolvedValue(null);
      repo.upsert.mockResolvedValue(makeRecord({ successRate: 0.62 }));
      await manager.recordFeedback({
        profileKey: 'OPENAI:gpt-4o',
        domain: DomainTag.CODING,
        taskFamily: 'coding-direct',
        signal: FeedbackSignal.POSITIVE,
      });
      const call = repo.upsert.mock.calls[0]![0];
      expect(call.successRate).toBeCloseTo(DEFAULT_SUCCESS_RATE + 0.02, 4);
      expect(call.counterField).toBe('feedbackPositive');
    });

    it('NEGATIVE shrinks successRate by 0.03', async () => {
      repo.findByKey.mockResolvedValue(makeRecord({ successRate: 0.7 }));
      repo.upsert.mockResolvedValue(makeRecord({ successRate: 0.67 }));
      await manager.recordFeedback({
        profileKey: 'OPENAI:gpt-4o',
        domain: DomainTag.CODING,
        taskFamily: 'coding-direct',
        signal: FeedbackSignal.NEGATIVE,
      });
      const call = repo.upsert.mock.calls[0]![0];
      expect(call.successRate).toBeCloseTo(0.67, 4);
      expect(call.counterField).toBe('feedbackNegative');
    });

    it('5 NEGATIVES from a 0.4 baseline never drops below floor', async () => {
      const state = { rate: 0.4 };
      repo.findByKey.mockImplementation(async () => makeRecord({ successRate: state.rate }));
      repo.upsert.mockImplementation(async (input) => {
        state.rate = input.successRate;
        return makeRecord({ successRate: state.rate });
      });
      for (let i = 0; i < 5; i += 1) {
        await manager.recordFeedback({
          profileKey: 'k',
          domain: DomainTag.CODING,
          taskFamily: 't',
          signal: FeedbackSignal.NEGATIVE,
        });
      }
      expect(state.rate).toBeGreaterThanOrEqual(SUCCESS_RATE_FLOOR);
    });

    it('JUDGE_VERIFIED → judgeVerified counter + +0.015 delta', async () => {
      repo.findByKey.mockResolvedValue(makeRecord({ successRate: 0.6 }));
      repo.upsert.mockResolvedValue(makeRecord());
      await manager.recordFeedback({
        profileKey: 'k',
        domain: DomainTag.CODING,
        taskFamily: 't',
        signal: FeedbackSignal.JUDGE_VERIFIED,
      });
      const call = repo.upsert.mock.calls[0]![0];
      expect(call.counterField).toBe('judgeVerified');
      expect(call.successRate).toBeCloseTo(0.615, 4);
    });

    it('JUDGE_ESCALATED → judgeEscalated counter + -0.04 delta', async () => {
      repo.findByKey.mockResolvedValue(makeRecord({ successRate: 0.7 }));
      repo.upsert.mockResolvedValue(makeRecord());
      await manager.recordFeedback({
        profileKey: 'k',
        domain: DomainTag.CODING,
        taskFamily: 't',
        signal: FeedbackSignal.JUDGE_ESCALATED,
      });
      const call = repo.upsert.mock.calls[0]![0];
      expect(call.counterField).toBe('judgeEscalated');
      expect(call.successRate).toBeCloseTo(0.66, 4);
    });

    it('FALLBACK_TRIGGERED → fallbackTriggered counter + small negative delta', async () => {
      repo.findByKey.mockResolvedValue(makeRecord({ successRate: 0.7 }));
      repo.upsert.mockResolvedValue(makeRecord());
      await manager.recordFeedback({
        profileKey: 'k',
        domain: DomainTag.CODING,
        taskFamily: 't',
        signal: FeedbackSignal.FALLBACK_TRIGGERED,
      });
      const call = repo.upsert.mock.calls[0]![0];
      expect(call.counterField).toBe('fallbackTriggered');
      expect(call.successRate).toBeCloseTo(0.695, 4);
    });
  });

  describe('getRollingScore', () => {
    it('returns DEFAULT when no record exists', async () => {
      repo.findByKey.mockResolvedValue(null);
      const score = await manager.getRollingScore('k', DomainTag.CODING, 't');
      expect(score).toBe(DEFAULT_SUCCESS_RATE);
    });

    it('returns recorded successRate when present', async () => {
      repo.findByKey.mockResolvedValue(makeRecord({ successRate: 0.81 }));
      const score = await manager.getRollingScore('k', DomainTag.CODING, 't');
      expect(score).toBe(0.81);
    });
  });
});
