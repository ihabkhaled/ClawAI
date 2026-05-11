import { MultiModelReviewOrchestratorManager } from '../multi-model-review-orchestrator.manager';
import { AppConfig } from '../../../../app/config/app.config';
import * as cloudClient from '../../utilities/cloud-generation-client.utility';

const mockConfig = {
  CHAT_SERVICE_URL: 'http://chat-service:4002',
  AI_ACTION_REQUEST_TIMEOUT_MS: 60_000,
};

const valid = {
  content: 'The PR adds X with rationale Y.',
  reviewerModels: [
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4', label: 'Sonnet' },
    { provider: 'OPENAI', model: 'gpt-4o' },
  ],
};

describe('MultiModelReviewOrchestratorManager', () => {
  let manager: MultiModelReviewOrchestratorManager;
  let callSpy: jest.SpyInstance;

  beforeEach(() => {
    manager = new MultiModelReviewOrchestratorManager();
    jest.spyOn(AppConfig, 'get').mockReturnValue(mockConfig as unknown as ReturnType<typeof AppConfig.get>);
    callSpy = jest.spyOn(cloudClient, 'callCloudGenerate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs every reviewer in parallel and returns successes with labels', async () => {
    callSpy.mockImplementation(async ({ provider }) => ({
      content: `verdict from ${provider}`,
      inputTokens: 10,
      outputTokens: 20,
    }));

    const result = await manager.run(valid);

    expect(callSpy).toHaveBeenCalledTimes(2);
    expect(result.reviewers).toHaveLength(2);
    expect(result.reviewers[0]?.label).toBe('Sonnet');
    expect(result.reviewers[1]?.label).toBe('OPENAI/gpt-4o'); // default label
    expect(result.reviewers.every((r) => r.success)).toBe(true);
    expect(result.judge).toBeNull();
    expect(result.anyReviewerSucceeded).toBe(true);
  });

  it('one reviewer failing does not kill the rest', async () => {
    callSpy.mockImplementation(async ({ provider }) => {
      if (provider === 'OPENAI') throw new Error('OpenAI timed out');
      return { content: 'sonnet says yes', inputTokens: 1, outputTokens: 2 };
    });

    const result = await manager.run(valid);

    expect(result.reviewers).toHaveLength(2);
    expect(result.reviewers[0]?.success).toBe(true);
    expect(result.reviewers[1]?.success).toBe(false);
    expect(result.reviewers[1]?.errorMessage).toContain('OpenAI timed out');
    expect(result.anyReviewerSucceeded).toBe(true);
  });

  it('runs judge synthesis pass when judgeModel is provided', async () => {
    callSpy.mockImplementation(async (input) => {
      if (input.provider === 'JUDGE_PROVIDER') {
        // The judge prompt MUST mention "Final Recommendation" in the system
        expect(input.systemPrompt).toContain('Final Recommendation');
        // ...and the user prompt must concatenate every reviewer's content
        expect(input.userPrompt).toContain('verdict from ANTHROPIC');
        expect(input.userPrompt).toContain('verdict from OPENAI');
        return { content: '## Final Recommendation\nMerge.', inputTokens: 100, outputTokens: 50 };
      }
      return { content: `verdict from ${input.provider}`, inputTokens: 10, outputTokens: 20 };
    });

    const result = await manager.run({
      ...valid,
      judgeModel: { provider: 'JUDGE_PROVIDER', model: 'judge-1', label: 'Judge' },
    });

    expect(result.judge).not.toBeNull();
    expect(result.judge?.success).toBe(true);
    expect(result.judge?.content).toContain('Merge');
    expect(result.judge?.label).toBe('Judge');
  });

  it('skips judge pass when every reviewer failed', async () => {
    callSpy.mockRejectedValue(new Error('upstream 5xx'));

    const result = await manager.run({
      ...valid,
      judgeModel: { provider: 'JUDGE', model: 'j' },
    });

    expect(result.anyReviewerSucceeded).toBe(false);
    expect(result.judge).toBeNull();
    // 2 reviewer calls; judge call was suppressed (callSpy total = 2)
    expect(callSpy).toHaveBeenCalledTimes(2);
  });

  it('caps reviewers at 5', async () => {
    callSpy.mockResolvedValue({ content: 'ok', inputTokens: 1, outputTokens: 1 });
    const result = await manager.run({
      content: valid.content,
      reviewerModels: Array.from({ length: 8 }, (_, i) => ({
        provider: 'P',
        model: `m${String(i)}`,
      })),
    });
    expect(callSpy).toHaveBeenCalledTimes(5);
    expect(result.reviewers).toHaveLength(5);
  });

  it('rejects empty content', async () => {
    await expect(manager.run({ ...valid, content: '   ' })).rejects.toThrow(
      'content is empty',
    );
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('rejects empty reviewer list', async () => {
    await expect(manager.run({ content: 'x', reviewerModels: [] })).rejects.toThrow(
      'reviewerModels is empty',
    );
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('surfaces judge failure without losing reviewer outputs', async () => {
    callSpy.mockImplementation(async (input) => {
      if (input.provider === 'JUDGE') throw new Error('judge 5xx');
      return { content: `v from ${input.provider}`, inputTokens: 1, outputTokens: 1 };
    });
    const result = await manager.run({
      ...valid,
      judgeModel: { provider: 'JUDGE', model: 'j' },
    });
    expect(result.reviewers.every((r) => r.success)).toBe(true);
    expect(result.judge?.success).toBe(false);
    expect(result.judge?.errorMessage).toContain('judge 5xx');
  });
});
