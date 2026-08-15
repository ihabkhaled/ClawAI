import { RouterEducationManager } from '../managers/router-education.manager';
import type {
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
} from '../types/routing-education.types';

const baseDecisions = () => [
  {
    id: 'decision-1',
    messageId: 'msg-1',
    threadId: 'thread-1',
    selectedProvider: 'ANTHROPIC',
    selectedModel: 'claude-sonnet-4',
    confidence: 0.74,
    routingMode: 'AUTO',
    detectedCategory: 'coding',
    secondaryCategory: null,
    reasonTags: ['auto', 'coding'],
    createdAt: new Date(),
    outcomes: [
      {
        finalExecutionProvider: 'ANTHROPIC',
        finalExecutionModel: 'claude-sonnet-4',
        executionSuccess: true,
        actualLatencyMs: 1400,
        actualCostEstimate: 0.01,
        fallbackUsed: false,
        judgeOutcome: 'VERIFIED',
        issueTags: [],
        evaluatorVersion: 'judge-v1',
      },
    ],
    feedbackRecords: [{ feedbackValue: 'POSITIVE', weight: 1 }],
  },
  {
    id: 'decision-2',
    messageId: 'msg-2',
    threadId: 'thread-1',
    selectedProvider: 'OPENAI',
    selectedModel: 'gpt-4o-mini',
    confidence: 0.62,
    routingMode: 'AUTO',
    detectedCategory: 'coding',
    secondaryCategory: null,
    reasonTags: ['auto', 'coding'],
    createdAt: new Date(),
    outcomes: [
      {
        finalExecutionProvider: 'OPENAI',
        finalExecutionModel: 'gpt-4o-mini',
        executionSuccess: true,
        actualLatencyMs: 900,
        actualCostEstimate: 0.02,
        fallbackUsed: false,
        judgeOutcome: 'ESCALATED',
        issueTags: ['hallucination_risk'],
        evaluatorVersion: 'judge-v1',
      },
    ],
    feedbackRecords: [{ feedbackValue: 'NEGATIVE', weight: 1 }],
  },
  {
    id: 'decision-3',
    messageId: 'msg-3',
    threadId: 'thread-1',
    selectedProvider: 'ANTHROPIC',
    selectedModel: 'claude-sonnet-4',
    confidence: 0.78,
    routingMode: 'AUTO',
    detectedCategory: 'coding',
    secondaryCategory: null,
    reasonTags: ['auto', 'coding'],
    createdAt: new Date(),
    outcomes: [
      {
        finalExecutionProvider: 'ANTHROPIC',
        finalExecutionModel: 'claude-sonnet-4',
        executionSuccess: true,
        // Outlier: a 60s latency spike against otherwise ~1-1.4s observations.
        actualLatencyMs: 60_000,
        actualCostEstimate: 0.01,
        fallbackUsed: false,
        judgeOutcome: 'VERIFIED',
        issueTags: [],
        evaluatorVersion: 'judge-v2',
      },
    ],
    feedbackRecords: [{ feedbackValue: 'POSITIVE', weight: 1 }],
  },
  {
    id: 'decision-4',
    messageId: 'msg-4',
    threadId: 'thread-1',
    selectedProvider: 'OPENAI',
    selectedModel: 'gpt-4o-mini',
    confidence: 0.58,
    routingMode: 'AUTO',
    detectedCategory: 'coding',
    secondaryCategory: null,
    reasonTags: ['auto', 'coding'],
    createdAt: new Date(),
    outcomes: [
      {
        finalExecutionProvider: 'OPENAI',
        finalExecutionModel: 'gpt-4o-mini',
        executionSuccess: true,
        actualLatencyMs: 800,
        actualCostEstimate: 0.02,
        fallbackUsed: false,
        judgeOutcome: 'ESCALATED',
        issueTags: ['hallucination_risk'],
        evaluatorVersion: null,
      },
    ],
    feedbackRecords: [{ feedbackValue: 'NEGATIVE', weight: 1 }],
  },
];

const mockRepository = () => ({
  findDecisionByMessageId: jest.fn(),
  findDecisionByAssistantMessageId: jest.fn(),
  upsertOutcomeRecord: jest.fn().mockImplementation(() => Promise.resolve()),
  createFeedbackRecord: jest.fn().mockImplementation(() => Promise.resolve()),
  findEducationWindow: jest.fn().mockResolvedValue(baseDecisions()),
  commitCalibrationBatch: jest.fn().mockImplementation((input) =>
    Promise.resolve({
      id: 'snapshot-1',
      version: input.version,
      windowDays: input.windowDays,
      summary: input.summary,
      promptHints: input.promptHints,
      modelProfiles: input.modelProfiles,
      topicProfiles: input.topicProfiles,
      active: true,
      generatedAt: new Date(),
    }),
  ),
  restoreCalibrationSnapshot: jest.fn().mockImplementation(() => Promise.resolve()),
  getLatestCalibrationSnapshot: jest.fn().mockResolvedValue(null),
  getCalibrationSnapshotByVersion: jest.fn().mockResolvedValue(null),
  getPreviousCalibrationSnapshot: jest.fn().mockResolvedValue(null),
  listModelProfiles: jest.fn().mockResolvedValue([]),
  listTopicProfiles: jest.fn().mockResolvedValue([]),
  findBestModelProfile: jest.fn().mockResolvedValue({
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    taskFamily: 'coding',
    topicKey: 'coding',
    weightedSuccessScore: 0.91,
    confidenceInProfile: 0.88,
    sampleSize: 4,
    calibrationTrustScore: 0.9,
  }),
  findModelProfile: jest.fn().mockResolvedValue({
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    taskFamily: 'coding',
    topicKey: 'coding',
    weightedSuccessScore: 0.55,
    confidenceInProfile: 0.42,
    sampleSize: 4,
    calibrationTrustScore: 0.5,
  }),
});

describe('RouterEducationManager', () => {
  it('builds a calibration snapshot with best models and caution models', async () => {
    const repository = mockRepository();
    const manager = new RouterEducationManager(repository as never);

    const snapshot = await manager.rebuildCalibrationSnapshot();

    expect(snapshot.summary.decisionsAnalyzed).toBe(4);
    expect(snapshot.promptHints.bestModelsByTaskFamily[0]?.provider).toBe('ANTHROPIC');
    expect(snapshot.promptHints.cautionModels.some((item) => item.provider === 'OPENAI')).toBe(
      true,
    );
    expect(repository.commitCalibrationBatch).toHaveBeenCalledTimes(1);
  });

  it('can override a weak decision using learned profiles', async () => {
    const repository = mockRepository();
    const manager = new RouterEducationManager(repository as never);

    const result = await manager.calibrateDecision(
      {
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-4o-mini',
        routingMode: 'AUTO' as never,
        confidence: 0.63,
        reasonTags: ['auto'],
        privacyClass: 'cloud',
        costClass: 'medium',
        fallbackChain: [],
        detectedCategory: 'coding',
      },
      {
        message: 'debug this TypeScript race condition',
        connectorHealth: { OPENAI: true, ANTHROPIC: true },
        runtimeHealth: { OLLAMA: true },
      },
    );

    expect(result.changed).toBe(true);
    expect(result.decision.selectedProvider).toBe('ANTHROPIC');
    expect(result.decision.selectedModel).toBe('claude-sonnet-4');
    expect(result.decision.reasonTags).toContain('learned_profile_override');
  });

  it('does not override an explicit no-reachable-model decision', async () => {
    const repository = mockRepository();
    const manager = new RouterEducationManager(repository as never);

    const result = await manager.calibrateDecision(
      {
        selectedProvider: 'UNAVAILABLE',
        selectedModel: 'NONE',
        routingMode: 'AUTO' as never,
        confidence: 0,
        reasonTags: ['auto', 'no_reachable_execution_model'],
        privacyClass: 'unknown',
        costClass: 'unknown',
        fallbackChain: [],
      },
      { message: 'hi', connectorHealth: {}, runtimeHealth: {} },
    );

    expect(result.changed).toBe(false);
    expect(result.decision.selectedProvider).toBe('UNAVAILABLE');
    expect(result.decision.selectedModel).toBe('NONE');
  });

  it('links thumbs feedback through assistant message ids when the routing decision uses the user message id', async () => {
    const repository = mockRepository();
    repository.findDecisionByAssistantMessageId.mockResolvedValue({
      id: 'decision-1',
      messageId: 'user-msg-1',
      threadId: 'thread-1',
      selectedProvider: 'FILE_GENERATION',
      selectedModel: 'auto',
      confidence: 0.88,
      routingMode: 'AUTO',
      detectedCategory: 'general',
      secondaryCategory: null,
      reasonTags: ['file_generation'],
      createdAt: new Date(),
      outcomes: [],
      feedbackRecords: [],
    });

    const manager = new RouterEducationManager(repository as never);

    await manager.ingestFeedbackSignal({
      messageId: 'assistant-msg-1',
      threadId: 'thread-1',
      feedback: 'positive',
      provider: 'FILE_GENERATION',
      model: 'auto',
    });

    expect(repository.createFeedbackRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        routingDecisionId: 'decision-1',
        messageId: 'assistant-msg-1',
        threadId: 'thread-1',
      }),
    );
  });

  // V5 learning evolution (ADR-069) ---------------------------------------

  describe('minimum-samples gating (calibrateDecision blend)', () => {
    it('does not blend confidence toward a profile below MIN_PROFILE_SAMPLE_SIZE', async () => {
      const repository = mockRepository();
      repository.findModelProfile.mockResolvedValue({
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        taskFamily: 'coding',
        topicKey: 'coding',
        weightedSuccessScore: 0.2,
        confidenceInProfile: 0.9,
        sampleSize: 1,
        calibrationTrustScore: 0.1,
      });
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.calibrateDecision(
        {
          selectedProvider: 'OPENAI',
          selectedModel: 'gpt-4o-mini',
          routingMode: 'AUTO' as never,
          confidence: 0.7,
          reasonTags: ['auto'],
          privacyClass: 'cloud',
          costClass: 'medium',
          fallbackChain: [],
          detectedCategory: 'coding',
        },
        { message: 'hi', connectorHealth: {}, runtimeHealth: {} },
      );

      // Thin profile (sampleSize 1 < MIN_PROFILE_SAMPLE_SIZE 2) must not pull
      // confidence at all, even though its calibrationTrustScore is far from
      // the decision's own confidence.
      expect(result.decision.confidence).toBe(0.7);
      expect(result.decision.reasonTags).not.toContain('profile_calibrated');
    });

    it('scales the blend by the profile confidence once past the minimum', async () => {
      const repository = mockRepository();
      repository.findModelProfile.mockResolvedValue({
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        taskFamily: 'coding',
        topicKey: 'coding',
        weightedSuccessScore: 0.2,
        confidenceInProfile: 0.1,
        sampleSize: 5,
        calibrationTrustScore: 0.1,
      });
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.calibrateDecision(
        {
          selectedProvider: 'OPENAI',
          selectedModel: 'gpt-4o-mini',
          routingMode: 'AUTO' as never,
          confidence: 0.7,
          reasonTags: ['auto'],
          privacyClass: 'cloud',
          costClass: 'medium',
          fallbackChain: [],
          detectedCategory: 'coding',
        },
        { message: 'hi', connectorHealth: {}, runtimeHealth: {} },
      );

      // A low-confidence profile (0.1) blends in only lightly: the resulting
      // confidence should sit much closer to the original 0.7 than a full
      // CALIBRATION_BLEND=0.3 application (which would land at 0.7*0.7+0.1*0.3=0.52).
      expect(result.decision.reasonTags).toContain('profile_calibrated');
      expect(result.decision.confidence).toBeGreaterThan(0.6);
      expect(result.decision.confidence).toBeLessThan(0.7);
    });
  });

  describe('confidence intervals and evaluator attribution', () => {
    it('attaches a bounded confidence interval and evaluator versions to every committed profile row', async () => {
      const repository = mockRepository();
      const manager = new RouterEducationManager(repository as never);

      await manager.rebuildCalibrationSnapshot();

      const call = repository.commitCalibrationBatch.mock.calls[0]?.[0] as {
        modelProfileRows: RouterModelProfileRecord[];
        topicProfileRows: RouterTopicProfileRecord[];
        version: string;
      };
      expect(call.modelProfileRows.length).toBeGreaterThan(0);
      for (const row of call.modelProfileRows) {
        expect(row.successRateLowerBound).not.toBeNull();
        expect(row.successRateUpperBound).not.toBeNull();
        expect(row.successRateLowerBound as number).toBeLessThanOrEqual(row.successRate);
        expect(row.successRateUpperBound as number).toBeGreaterThanOrEqual(row.successRate);
        // Every row is stamped with the batch's own version.
        expect(row.scoreVersion).toBe(call.version);
      }
      // decision-1/decision-3 report judge-v1/judge-v2; decision-4 reports
      // no evaluator at all and falls back to the unversioned sentinel.
      const anthropic = call.modelProfileRows.find((row) => row.provider === 'ANTHROPIC');
      expect(anthropic?.evaluatorVersions).toEqual(['judge-v1', 'judge-v2']);
      const openai = call.modelProfileRows.find((row) => row.provider === 'OPENAI');
      expect(openai?.evaluatorVersions).toContain('unversioned');

      for (const row of call.topicProfileRows) {
        expect(row.successRateLowerBound).not.toBeNull();
        expect(row.successRateUpperBound).not.toBeNull();
        expect(row.scoreVersion).toBe(call.version);
      }
    });

    it('keeps every interval strictly narrower than the maximally-uncertain default', async () => {
      const repository = mockRepository();
      const manager = new RouterEducationManager(repository as never);

      await manager.rebuildCalibrationSnapshot();

      const call = repository.commitCalibrationBatch.mock.calls[0]?.[0] as {
        modelProfileRows: RouterModelProfileRecord[];
      };
      for (const row of call.modelProfileRows) {
        const width = (row.successRateUpperBound ?? 0) - (row.successRateLowerBound ?? 0);
        // routeCount is 2 for every bucket in this fixture — some evidence,
        // so the interval must be strictly narrower than the zero-evidence
        // default of [0, 1] (width 1).
        expect(width).toBeLessThan(1);
        expect(width).toBeGreaterThan(0);
      }
    });
  });

  describe('outlier control', () => {
    it('does not let a single 60s latency spike dominate the averaged latency', async () => {
      const repository = mockRepository();
      const manager = new RouterEducationManager(repository as never);

      await manager.rebuildCalibrationSnapshot();

      const call = repository.commitCalibrationBatch.mock.calls[0]?.[0] as {
        modelProfileRows: RouterModelProfileRecord[];
      };
      const anthropic = call.modelProfileRows.find((row) => row.provider === 'ANTHROPIC');
      // decision-1 reports 1400ms, decision-3 reports a 60_000ms outlier. A
      // naive mean would land at 30_700ms; the outlier is winsorized down to
      // the MAX_LATENCY_OUTLIER_MS ceiling (30_000ms) before averaging, so
      // the aggregate lands at (1400 + 30_000) / 2 = 15_700ms — well below
      // the naive mean, and nowhere near the raw 60s spike.
      expect(anthropic?.averageLatencyMs).toBe(15_700);
      expect(anthropic?.averageLatencyMs as number).toBeLessThan(30_700);
    });
  });

  describe('rollbackCalibration', () => {
    it('reports SNAPSHOT_NOT_FOUND when there is nothing to roll back to', async () => {
      const repository = mockRepository();
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.rollbackCalibration();

      expect(result).toEqual({
        rolledBack: false,
        restoredVersion: null,
        reason: 'SNAPSHOT_NOT_FOUND',
      });
      expect(repository.restoreCalibrationSnapshot).not.toHaveBeenCalled();
    });

    it('reports NO_ARCHIVED_PROFILES for a pre-ADR-069 snapshot with no archived rows', async () => {
      const repository = mockRepository();
      repository.getCalibrationSnapshotByVersion.mockResolvedValue({
        id: 'old-snap',
        version: 'calibration-1',
        windowDays: 30,
        summary: {},
        promptHints: {},
        modelProfiles: null,
        topicProfiles: null,
        active: false,
        generatedAt: new Date(),
      });
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.rollbackCalibration('calibration-1');

      expect(result).toEqual({
        rolledBack: false,
        restoredVersion: 'calibration-1',
        reason: 'NO_ARCHIVED_PROFILES',
      });
      expect(repository.restoreCalibrationSnapshot).not.toHaveBeenCalled();
    });

    it('restores a previously committed batch and reports success', async () => {
      const repository = mockRepository();
      const archivedModelProfiles = [{ provider: 'ANTHROPIC', model: 'claude-sonnet-4' }];
      const archivedTopicProfiles = [{ taskFamily: 'coding', topicKey: 'coding' }];
      repository.getCalibrationSnapshotByVersion.mockResolvedValue({
        id: 'good-snap',
        version: 'calibration-1',
        windowDays: 30,
        summary: {},
        promptHints: {},
        modelProfiles: archivedModelProfiles,
        topicProfiles: archivedTopicProfiles,
        active: false,
        generatedAt: new Date(),
      });
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.rollbackCalibration('calibration-1');

      expect(result).toEqual({
        rolledBack: true,
        restoredVersion: 'calibration-1',
        reason: null,
      });
      expect(repository.restoreCalibrationSnapshot).toHaveBeenCalledWith({
        version: 'calibration-1',
        modelProfileRows: archivedModelProfiles,
        topicProfileRows: archivedTopicProfiles,
      });
    });

    it('falls back to the previous snapshot when no version is given', async () => {
      const repository = mockRepository();
      repository.getPreviousCalibrationSnapshot.mockResolvedValue({
        id: 'prev-snap',
        version: 'calibration-0',
        windowDays: 30,
        summary: {},
        promptHints: {},
        modelProfiles: [],
        topicProfiles: [],
        active: false,
        generatedAt: new Date(),
      });
      const manager = new RouterEducationManager(repository as never);

      const result = await manager.rollbackCalibration();

      expect(result.rolledBack).toBe(true);
      expect(result.restoredVersion).toBe('calibration-0');
      expect(repository.getCalibrationSnapshotByVersion).not.toHaveBeenCalled();
    });
  });
});
