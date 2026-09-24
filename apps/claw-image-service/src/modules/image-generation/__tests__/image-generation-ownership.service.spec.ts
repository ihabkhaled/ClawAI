import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';

import { BusinessException } from '../../../common/errors';
import { ImageGenerationService } from '../services/image-generation.service';

vi.mock('../managers/image-execution.manager');

const OWNER = 'user-owner';
const STRANGER = 'user-stranger';

const failedRecord = {
  id: 'img-1',
  userId: OWNER,
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'a lighthouse at dusk',
  revisedPrompt: null,
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  status: 'FAILED',
  errorCode: 'PROVIDER_ERROR',
  errorMessage: 'x',
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assets: [],
};

type Mocks = {
  repo: Record<'findById' | 'create' | 'updateStatus' | 'createEvent' | 'createAsset', Mock>;
  execute: Mock;
  publish: Mock;
  rabbitPublish: Mock;
};

const build = (found: typeof failedRecord | null): { service: ImageGenerationService } & Mocks => {
  const repo = {
    findById: vi.fn().mockResolvedValue(found),
    create: vi.fn().mockResolvedValue({ ...failedRecord, id: 'img-2', status: 'QUEUED' }),
    updateStatus: vi.fn().mockResolvedValue(failedRecord),
    createEvent: vi.fn().mockResolvedValue(undefined),
    createAsset: vi.fn(),
  };
  const execute = vi.fn().mockRejectedValue(new Error('provider down'));
  const publish = vi.fn();
  const rabbitPublish = vi.fn().mockResolvedValue(undefined);
  const service = new ImageGenerationService(
    repo as never,
    { execute } as never,
    { publish } as never,
    { publish: rabbitPublish } as never,
  );
  return { service, repo, execute, publish, rabbitPublish };
};

const captureError = async (promise: Promise<unknown>): Promise<BusinessException> => {
  const error: unknown = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(BusinessException);
  return error as BusinessException;
};

const expectNothingStarted = (m: Mocks): void => {
  expect(m.repo.updateStatus).not.toHaveBeenCalled();
  expect(m.repo.createEvent).not.toHaveBeenCalled();
  expect(m.repo.create).not.toHaveBeenCalled();
  expect(m.publish).not.toHaveBeenCalled();
  expect(m.execute).not.toHaveBeenCalled();
};

describe('ImageGenerationService — ownership on the user-facing retry routes', () => {
  it('answers a missing id with 404 IMAGE_NOT_FOUND', async () => {
    const m = build(null);
    const error = await captureError(m.service.getByIdForUser('nope', OWNER));
    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.code).toBe('IMAGE_NOT_FOUND');
  });

  it("answers someone else's id with the IDENTICAL 404 (no existence leak)", async () => {
    const missing = await captureError(build(null).service.getByIdForUser('img-1', STRANGER));
    const foreign = await captureError(
      build(failedRecord).service.getByIdForUser('img-1', STRANGER),
    );
    expect(foreign.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(foreign.getResponse()).toEqual(missing.getResponse());
  });

  describe('retryGenerationForUser', () => {
    it("refuses a stranger with 404 and starts no processing on the owner's row", async () => {
      const m = build(failedRecord);
      const error = await captureError(m.service.retryGenerationForUser('img-1', STRANGER));
      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expectNothingStarted(m);
    });

    it('re-queues the row for its owner', async () => {
      const m = build(failedRecord);
      await m.service.retryGenerationForUser('img-1', OWNER);
      expect(m.repo.updateStatus).toHaveBeenCalledWith('img-1', 'QUEUED', {
        errorCode: undefined,
        errorMessage: undefined,
      });
      expect(m.publish).toHaveBeenCalledWith(
        expect.objectContaining({ generationId: 'img-1', status: 'QUEUED' }),
      );
    });
  });

  describe('retryWithAlternateModelForUser', () => {
    it('refuses a stranger with 404 and clones nothing', async () => {
      const m = build(failedRecord);
      const error = await captureError(
        m.service.retryWithAlternateModelForUser('img-1', STRANGER, 'IMAGE_OPENAI', 'gpt-image-1'),
      );
      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expectNothingStarted(m);
    });

    it("clones the owner's row onto the requested model", async () => {
      const m = build(failedRecord);
      const result = await m.service.retryWithAlternateModelForUser(
        'img-1',
        OWNER,
        'IMAGE_OPENAI',
        'gpt-image-1',
      );
      expect(result.id).toBe('img-2');
      expect(m.repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: OWNER, provider: 'IMAGE_OPENAI', model: 'gpt-image-1' }),
      );
    });
  });
});
