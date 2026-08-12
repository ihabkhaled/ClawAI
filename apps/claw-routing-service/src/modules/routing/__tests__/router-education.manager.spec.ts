import { RouterEducationManager } from '../managers/router-education.manager';

describe('RouterEducationManager', () => {
  const mockRepository = () => ({
    findDecisionByMessageId: jest.fn(),
    findDecisionByAssistantMessageId: jest.fn(),
    upsertOutcomeRecord: jest.fn().mockImplementation(() => Promise.resolve()),
    createFeedbackRecord: jest.fn().mockImplementation(() => Promise.resolve()),
    findEducationWindow: jest.fn().mockResolvedValue([
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
            actualLatencyMs: 1100,
            actualCostEstimate: 0.01,
            fallbackUsed: false,
            judgeOutcome: 'VERIFIED',
            issueTags: [],
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
          },
        ],
        feedbackRecords: [{ feedbackValue: 'NEGATIVE', weight: 1 }],
      },
    ]),
    replaceModelProfiles: jest.fn().mockImplementation(() => Promise.resolve()),
    replaceTopicProfiles: jest.fn().mockImplementation(() => Promise.resolve()),
    createCalibrationSnapshot: jest.fn().mockImplementation(() => Promise.resolve()),
    getLatestCalibrationSnapshot: jest.fn().mockResolvedValue(null),
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

  it('builds a calibration snapshot with best models and caution models', async () => {
    const repository = mockRepository();
    const manager = new RouterEducationManager(repository as never);

    const snapshot = await manager.rebuildCalibrationSnapshot();

    expect(snapshot.summary.decisionsAnalyzed).toBe(4);
    expect(snapshot.promptHints.bestModelsByTaskFamily[0]?.provider).toBe('ANTHROPIC');
    expect(snapshot.promptHints.cautionModels.some((item) => item.provider === 'OPENAI')).toBe(
      true,
    );
    expect(repository.replaceModelProfiles).toHaveBeenCalled();
    expect(repository.replaceTopicProfiles).toHaveBeenCalled();
    expect(repository.createCalibrationSnapshot).toHaveBeenCalled();
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
});
