import { type Mock, vi } from 'vitest';
// Multimodal batch 9 — audio chat-service synthesised for a reply's owner.
// Stored COMPLETED with its spoken text; never extracted, never transcribed.

import { FilesService } from '../files.service';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';

vi.mock('../../../../common/utilities', () => ({
  verifyAccessToken: vi.fn(),
  saveFile: vi.fn().mockReturnValue('/data/uploads/reply.wav'),
  deleteFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ FILE_RETENTION_DAYS: 0 })) },
}));

const WAV_BASE64 = Buffer.from('RIFF$\u0000\u0000\u0000WAVEfmt ').toString('base64');

describe('FilesService.storeGeneratedAudio', () => {
  let create: Mock;
  let runAllChecks: Mock;
  let processFile: Mock;
  let publish: Mock;
  let service: FilesService;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue({ id: 'file-9' } as File);
    runAllChecks = vi.fn().mockResolvedValue({ passed: true, checks: [] });
    processFile = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(undefined);
    service = new FilesService(
      { create } as never,
      {} as never,
      { publish, publishConfirmed: publish } as never,
      {
        runAllChecks,
        getSanitizedFilename: vi.fn((name: string) => name),
      } as never,
      {} as never,
      { processFile, requestVideoProcessing: vi.fn(), updateIngestionStatus: vi.fn() },
    );
  });

  it('stores the audio COMPLETED for the named owner with the spoken text', async () => {
    const result = await service.storeGeneratedAudio({
      userId: 'user-1',
      filename: 'reply-msg-1.wav',
      mimeType: 'audio/wav',
      base64Data: WAV_BASE64,
      transcript: 'Hello there.',
    });

    expect(result).toEqual({ fileId: 'file-9' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        filename: 'reply-msg-1.wav',
        mimeType: 'audio/wav',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractedText: 'Hello there.',
        content: WAV_BASE64,
      }),
    );
  });

  it('runs the security pipeline on the bytes', async () => {
    await service.storeGeneratedAudio({
      userId: 'user-1',
      filename: 'reply.wav',
      mimeType: 'audio/wav',
      base64Data: WAV_BASE64,
    });
    expect(runAllChecks).toHaveBeenCalledTimes(1);
  });

  // Transcribing our own speech would bill the user for text they already have.
  it('never starts extraction, transcription or an upload event', async () => {
    await service.storeGeneratedAudio({
      userId: 'user-1',
      filename: 'reply.wav',
      mimeType: 'audio/wav',
      base64Data: WAV_BASE64,
    });
    expect(processFile).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('refuses bytes that fail a security check and stores nothing', async () => {
    runAllChecks.mockResolvedValue({
      passed: false,
      checks: [{ name: 'magic', passed: false, reason: 'mismatch' }],
    });
    await expect(
      service.storeGeneratedAudio({
        userId: 'user-1',
        filename: 'reply.wav',
        mimeType: 'audio/wav',
        base64Data: WAV_BASE64,
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
