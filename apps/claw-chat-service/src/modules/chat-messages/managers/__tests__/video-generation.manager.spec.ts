import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { httpRequest } from '../../../../common/utilities';
import type { AssembledContext } from '../../types/context.types';
import { VideoGenerationManager } from '../video-generation.manager';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  httpRequest: vi.fn(),
  buildInterServiceAuthHeader: () => 'Service test-token',
}));

const mockedHttp = vi.mocked(httpRequest);

const context = (
  text: string,
  fileContents: Array<{ id: string; mimeType: string }> = [],
): AssembledContext =>
  ({
    userId: 'user-1',
    threadMessages: [{ role: 'USER', content: text, id: 'm1', threadId: 't1', metadata: null }],
    fileContents,
    researchEvidence: [],
    platformOrigin: 'https://claw-ai.co',
  }) as unknown as AssembledContext;

describe('VideoGenerationManager', () => {
  let hasPlanFeatureFor: ReturnType<typeof vi.fn>;
  let askPlanner: ReturnType<typeof vi.fn>;
  let manager: VideoGenerationManager;

  const generate = (
    text: string,
    isAutoMode = true,
    fileContents: Array<{ id: string; mimeType: string }> = [],
  ): ReturnType<VideoGenerationManager['generate']> =>
    manager.generate({
      provider: 'VIDEO_GEMINI',
      model: 'veo-3.1-fast-generate-preview',
      context: context(text, fileContents),
      startTime: Date.now(),
      usedFallback: false,
      userId: 'user-1',
      isAutoMode,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      IMAGE_SERVICE_URL: 'http://image.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    hasPlanFeatureFor = vi.fn().mockResolvedValue(true);
    askPlanner = vi.fn().mockResolvedValue('A calm shot of the ocean at sunrise, slow pan.');
    mockedHttp.mockResolvedValue({
      ok: true,
      status: 201,
      data: { generationId: 'gen-1', status: 'QUEUED', provider: 'VIDEO_GEMINI', model: 'm' },
    } as never);
    manager = new VideoGenerationManager({ hasPlanFeatureFor } as never, { askPlanner } as never);
  });

  it('dispatches the planner prompt with the clip options and returns the generation id', async () => {
    const response = await generate('can you make a 6 second vertical video of the ocean?');

    expect(response.videoGenerationId).toBe('gen-1');
    expect(response.content).toContain('Generating video');
    expect(mockedHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://image.test/api/v1/internal/videos/generate',
        method: 'POST',
        headers: { Authorization: 'Service test-token' },
        body: expect.objectContaining({
          prompt: 'A calm shot of the ocean at sunrise, slow pan.',
          originalPrompt: 'can you make a 6 second vertical video of the ocean?',
          provider: 'VIDEO_GEMINI',
          model: 'veo-3.1-fast-generate-preview',
          userId: 'user-1',
          isAutoMode: true,
          durationSeconds: 6,
          aspectRatio: '9:16',
        }),
      }),
    );
  });

  it('image-to-video: sends the attached image id, asks the planner for MOTION only', async () => {
    await generate('animate this image', true, [
      { id: 'doc-1', mimeType: 'application/pdf' },
      { id: 'img-1', mimeType: 'image/PNG' },
      { id: 'img-2', mimeType: 'image/jpeg' },
    ]);

    const body = mockedHttp.mock.calls[0]?.[0].body as { sourceFileId?: string };
    expect(body.sourceFileId).toBe('img-1');
    const plannerPrompt = askPlanner.mock.calls[0]?.[0] as string;
    expect(plannerPrompt).toContain('animates');
    expect(plannerPrompt).toContain('never describe the image itself');
    expect(plannerPrompt).toContain('Motion request:\nanimate this image');
  });

  it('text-to-video sends no source image and keeps the shot planner', async () => {
    await generate('a video of a rocket', true, [{ id: 'doc-1', mimeType: 'application/pdf' }]);

    const body = mockedHttp.mock.calls[0]?.[0].body as Record<string, unknown>;
    expect(body).not.toHaveProperty('sourceFileId');
    expect(askPlanner.mock.calls[0]?.[0]).toContain('Video request:');
  });

  it('sends the user words unchanged when no planner answers, so a planner outage never blocks a video', async () => {
    askPlanner.mockResolvedValue(null);

    await generate('a video of a rocket');

    const body = mockedHttp.mock.calls[0]?.[0].body as { prompt: string; originalPrompt?: string };
    expect(body.prompt).toBe('a video of a rocket');
    expect(body).not.toHaveProperty('originalPrompt');
  });

  it('refuses in a sentence, spending nothing, when the plan has no media generation', async () => {
    hasPlanFeatureFor.mockResolvedValue(false);

    const response = await generate('a video of a rocket');

    expect(response.videoGenerationId).toBeUndefined();
    expect(response.content).toMatch(/isn't included in your current plan/);
    expect(askPlanner).not.toHaveBeenCalled();
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  it('turns image-service plan refusal into the same sentence', async () => {
    mockedHttp.mockResolvedValue({
      ok: false,
      status: 403,
      data: { code: 'PLAN_FEATURE_DISABLED' },
    } as never);

    const response = await generate('a video of a rocket');

    expect(response.content).toMatch(/isn't included in your current plan/);
    expect(response.videoGenerationId).toBeUndefined();
  });

  it('fails loudly when image-service errors, and keeps a credit refusal as 402', async () => {
    mockedHttp.mockResolvedValue({ ok: false, status: 402, data: {} } as never);

    await expect(generate('a video of a rocket')).rejects.toMatchObject({
      code: 'VIDEO_SERVICE_REQUEST_FAILED',
    });
    await expect(generate('a video of a rocket')).rejects.toMatchObject({ status: 402 });
  });
});
