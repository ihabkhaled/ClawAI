import { type Mock, vi } from 'vitest';
// ADR-137 — a clip image-service generated for its owner. Stored COMPLETED with
// no extraction job; the bytes still go through the full security pipeline.

import { FilesService } from '../files.service';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { storeGeneratedVideoSchema } from '../../dto/store-generated-video.dto';

vi.mock('../../../../common/utilities', () => ({
  verifyAccessToken: vi.fn(),
  saveFile: vi.fn().mockReturnValue('/data/uploads/clip.mp4'),
  deleteFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ FILE_RETENTION_DAYS: 0 })) },
}));

// An MP4 starts with a box header whose type is `ftyp`.
const MP4_BASE64 = Buffer.from(
  '\u0000\u0000\u0000\u0018ftypmp42\u0000\u0000\u0000\u0000mp42isom',
).toString('base64');

describe('FilesService.storeGeneratedVideo', () => {
  let create: Mock;
  let runAllChecks: Mock;
  let processFile: Mock;
  let publish: Mock;
  let service: FilesService;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue({ id: 'file-v1' } as File);
    runAllChecks = vi.fn().mockResolvedValue({ passed: true, checks: [] });
    processFile = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(undefined);
    service = new FilesService(
      { create } as never,
      {} as never,
      { publish, publishConfirmed: publish } as never,
      { runAllChecks, getSanitizedFilename: vi.fn((name: string) => name) } as never,
      {} as never,
      { processFile, requestVideoProcessing: vi.fn(), updateIngestionStatus: vi.fn() },
    );
  });

  it('stores the clip COMPLETED for the named owner', async () => {
    const result = await service.storeGeneratedVideo({
      userId: 'user-1',
      filename: 'generated-1.mp4',
      mimeType: 'video/mp4',
      base64Data: MP4_BASE64,
    });

    expect(result).toEqual({ fileId: 'file-v1' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        filename: 'generated-1.mp4',
        mimeType: 'video/mp4',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractedText: null,
        content: MP4_BASE64,
      }),
    );
  });

  it('runs the security pipeline, and never starts extraction or an upload event', async () => {
    await service.storeGeneratedVideo({
      userId: 'user-1',
      filename: 'generated-1.mp4',
      mimeType: 'video/mp4',
      base64Data: MP4_BASE64,
    });

    expect(runAllChecks).toHaveBeenCalledTimes(1);
    expect(processFile).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('refuses bytes that fail a security check and stores nothing', async () => {
    runAllChecks.mockResolvedValue({
      passed: false,
      checks: [{ name: 'magic', passed: false, reason: 'mismatch' }],
    });

    await expect(
      service.storeGeneratedVideo({
        userId: 'user-1',
        filename: 'generated-1.mp4',
        mimeType: 'video/mp4',
        base64Data: MP4_BASE64,
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('storeGeneratedVideoSchema', () => {
  const valid = {
    userId: 'user-1',
    filename: 'clip.mp4',
    mimeType: 'video/mp4',
    base64Data: MP4_BASE64,
  };

  it('accepts an mp4 and nothing else', () => {
    expect(storeGeneratedVideoSchema.safeParse(valid).success).toBe(true);
    expect(storeGeneratedVideoSchema.safeParse({ ...valid, mimeType: 'video/webm' }).success).toBe(
      false,
    );
    expect(storeGeneratedVideoSchema.safeParse({ ...valid, mimeType: 'image/png' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown field, a non-base64 body and a missing owner', () => {
    expect(storeGeneratedVideoSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(
      storeGeneratedVideoSchema.safeParse({ ...valid, base64Data: 'not base64!' }).success,
    ).toBe(false);
    expect(storeGeneratedVideoSchema.safeParse({ ...valid, userId: '' }).success).toBe(false);
  });
});
