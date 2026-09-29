import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';

import { BusinessException } from '../../../common/errors';
import { ImageGenerationService } from '../services/image-generation.service';
import type { ExecuteImageInput, GenerateImageParams } from '../types/image-generation.types';
import {
  baseRecord,
  buildInMemoryImageRepo,
  flushImageJobs as flush,
  type InMemoryImageRepo,
} from './fixtures/in-memory-image-repo.fixture';

const OWNER = 'user-1';
const OK = { fileId: 'file-out', revisedPrompt: null, latencyMs: 5 };

/** A minimal PNG header of the given size and colour type (6 = RGBA). */
const pngBase64 = (width: number, height: number, colorType = 6): string => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt8(8, 24);
  bytes.writeUInt8(colorType, 25);
  return bytes.toString('base64');
};

const EDIT: GenerateImageParams = {
  prompt: 'Edit the attached image: remove the background',
  originalPrompt: 'remove the background',
  provider: 'IMAGE_OPENAI',
  model: 'gpt-image-1',
  userId: OWNER,
  referenceImageBase64: pngBase64(512, 512),
  referenceImageMimeType: 'image/png',
  referenceFileId: 'file-src',
};

describe('ImageGenerationService — edits, masks and the original prompt', () => {
  let repo: InMemoryImageRepo;
  let execute: Mock;
  let loadStoredReference: Mock;
  let service: ImageGenerationService;

  const attempts = (): ExecuteImageInput[] =>
    execute.mock.calls.map((call) => call[0] as ExecuteImageInput);

  const files = (map: Record<string, string>): void => {
    loadStoredReference.mockImplementation((fileId: string, userId: string) => {
      const base64 = userId === OWNER ? map[fileId] : undefined;
      return base64 === undefined
        ? Promise.reject(new BusinessException('gone', 'IMAGE_REFERENCE_UNAVAILABLE'))
        : Promise.resolve({ base64, mimeType: 'image/png' });
    });
  };

  const refusal = async (params: GenerateImageParams): Promise<BusinessException> => {
    const error: unknown = await service.enqueueGeneration(params).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BusinessException);
    return error as BusinessException;
  };

  beforeEach(() => {
    repo = buildInMemoryImageRepo(baseRecord());
    execute = vi.fn().mockResolvedValue(OK);
    loadStoredReference = vi.fn();
    service = new ImageGenerationService(
      repo as never,
      {
        execute,
        loadStoredReference,
        settle: vi.fn().mockResolvedValue(undefined),
        releaseUnpersisted: vi.fn().mockResolvedValue(undefined),
      } as never,
      { publish: vi.fn() } as never,
      { publish: vi.fn().mockResolvedValue(undefined) } as never,
      { assertCanGenerate: vi.fn().mockResolvedValue(undefined) } as never,
    );
  });

  it('keeps the original prompt on the row next to the effective one (pack §79)', async () => {
    const record = await service.enqueueGeneration(EDIT);
    await flush();
    expect(repo.rows.get(record.id)?.originalPrompt).toBe('remove the background');
    expect(repo.rows.get(record.id)?.prompt).toBe(EDIT.prompt);
  });

  it('validates the mask against the owner-checked source, stores it and forwards it', async () => {
    const mask = pngBase64(512, 512);
    files({ 'file-mask': mask, 'file-src': pngBase64(512, 512) });

    const record = await service.enqueueGeneration({ ...EDIT, maskFileId: 'file-mask' });
    await flush();

    expect(loadStoredReference).toHaveBeenCalledWith('file-mask', OWNER);
    expect(loadStoredReference).toHaveBeenCalledWith('file-src', OWNER);
    expect(attempts()[0]?.maskImageBase64).toBe(mask);
    expect(await repo.findMaskAsset(record.id)).toMatchObject({ storageKey: 'file-mask' });
  });

  it.each([
    [
      'a mask on a provider that cannot apply one',
      { provider: 'IMAGE_GEMINI' },
      'IMAGE_MASK_NOT_SUPPORTED',
    ],
    ['a mask with no attached image', { referenceFileId: undefined }, 'IMAGE_MASK_INVALID'],
  ])('refuses %s with 422 before any row', async (_label, extra, code) => {
    files({ 'file-mask': pngBase64(512, 512), 'file-src': pngBase64(512, 512) });
    const error = await refusal({ ...EDIT, ...extra, maskFileId: 'file-mask' });
    expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(error.code).toBe(code);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('refuses a mask whose size differs from the source, before any row', async () => {
    files({ 'file-mask': pngBase64(256, 256), 'file-src': pngBase64(512, 512) });
    const error = await refusal({ ...EDIT, maskFileId: 'file-mask' });
    expect(error.code).toBe('IMAGE_MASK_INVALID');
    expect(repo.create).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('refuses a mask the user does not own (file-service owner check)', async () => {
    files({ 'file-src': pngBase64(512, 512) });
    const error = await refusal({ ...EDIT, maskFileId: 'someone-elses-mask' });
    expect(error.code).toBe('IMAGE_REFERENCE_UNAVAILABLE');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('walks only edit-capable providers when an AUTO edit fails', async () => {
    execute
      .mockRejectedValueOnce(new Error('gemini down'))
      .mockRejectedValueOnce(new Error('openai down'))
      .mockResolvedValueOnce(OK);
    await service.enqueueGeneration({
      ...EDIT,
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      isAutoMode: true,
    });
    await flush();
    expect(attempts().map((a) => a.provider)).toEqual([
      'IMAGE_GEMINI',
      'IMAGE_OPENAI',
      'IMAGE_LOCAL',
    ]);

    execute.mockReset().mockRejectedValue(new Error('down'));
    await service.enqueueGeneration({
      ...EDIT,
      provider: 'IMAGE_LOCAL',
      model: 'sdxl-turbo',
      isAutoMode: true,
    });
    await flush();
    // ComfyUI (text-to-image only) is never tried for an edit.
    expect(attempts().map((a) => a.provider)).toEqual(['IMAGE_LOCAL']);
  });
});
