import { vi } from 'vitest';

import { FileFormat } from '../../../generated/prisma';
import {
  GENERATE_MAX_CONTENT_CHARS,
  GENERATE_MAX_PROMPT_CHARS,
} from '../constants/file-asset.constants';
import { exportFileSchema, generateFileSchema } from '../dto/generate-file.dto';
import { FileGenerationService } from '../services/file-generation.service';

vi.mock('../managers/file-execution.manager');

describe('exportFileSchema', () => {
  it('accepts every real format and a title', () => {
    for (const format of ['TXT', 'MD', 'PDF', 'DOCX', 'CSV', 'JSON', 'HTML']) {
      expect(exportFileSchema.safeParse({ content: 'x', format, title: 'Notes' }).success).toBe(
        true,
      );
    }
  });

  // An unknown format used to reach Prisma as a string and fail there.
  it.each([
    [{ content: 'x', format: 'EXE' }, 'unknown format'],
    [{ content: 'x', format: 'pdf' }, 'wrong case'],
    [{ content: '', format: 'MD' }, 'empty content'],
    [{ content: 'x'.repeat(200_001), format: 'MD' }, 'over 200k characters'],
    [{ content: 'x', format: 'MD', title: 't'.repeat(121) }, 'title over 120'],
  ])('rejects %j (%s)', (body, _reason) => {
    expect(exportFileSchema.safeParse(body).success).toBe(false);
  });
});

describe('generateFileSchema', () => {
  const valid = {
    prompt: 'Make a PDF of my notes',
    content: '# Notes',
    format: 'PDF',
    provider: 'OLLAMA',
    model: 'gpt-oss:120b',
    userId: 'u1',
  };

  // The prompt is the user's whole chat message (up to 100k). At 4,000, every
  // longer file request failed after the model had already written the file.
  it('accepts a prompt as long as a chat message', () => {
    const prompt = 'p'.repeat(GENERATE_MAX_PROMPT_CHARS);
    expect(generateFileSchema.safeParse({ ...valid, prompt }).success).toBe(true);
  });

  it('accepts the largest file a writer can produce', () => {
    const content = 'c'.repeat(GENERATE_MAX_CONTENT_CHARS);
    expect(generateFileSchema.safeParse({ ...valid, content }).success).toBe(true);
  });

  // A free-string format reached Prisma and failed there as a 500.
  it.each([
    [{ ...valid, format: 'MARKDOWN' }, 'unknown format'],
    [{ ...valid, format: 'pdf' }, 'wrong case'],
    [{ ...valid, prompt: 'p'.repeat(GENERATE_MAX_PROMPT_CHARS + 1) }, 'prompt too long'],
    [{ ...valid, content: 'c'.repeat(GENERATE_MAX_CONTENT_CHARS + 1) }, 'content too long'],
  ])('rejects %s', (body, _reason) => {
    expect(generateFileSchema.safeParse(body).success).toBe(false);
  });
});

describe('FileGenerationService.exportForUser', () => {
  it('queues a conversion of the given text for that user, with no model', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'g1', status: 'QUEUED', format: 'DOCX' });
    const service = new FileGenerationService(
      {
        create,
        createEvent: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
      } as never,
      { generateFilename: vi.fn().mockReturnValue('generated.docx') } as never,
      { publish: vi.fn() } as never,
      { publish: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await service.exportForUser('u1', { content: '# Hi', format: FileFormat.DOCX, title: 'Plan' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        content: '# Hi',
        format: 'DOCX',
        provider: 'EXPORT',
        model: 'none',
        filename: 'Plan',
      }),
    );
  });
});
