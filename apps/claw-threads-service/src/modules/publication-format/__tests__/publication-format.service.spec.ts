import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { formatPublicationSchema } from '../dto/format-publication.dto';
import { PublicationFormatService } from '../services/publication-format.service';

const citations = [{ evidenceId: 'a1b2c3d4', url: 'https://example.com/a' }];
const target = {
  revisionId: 'rev-1',
  title: 'Solar costs',
  markdown: '# Solar costs\n\nA wall of text [a1b2c3d4].',
  citations,
  generationJobId: 'job-1',
  contentLocale: 'en',
  publicationType: 'article',
};
const dto = { idempotencyKey: 'key-12345678', correlationId: 'corr-1' };

function make(
  options: {
    target?: typeof target | null;
    reservation?: unknown;
    reply?: unknown;
    fail?: boolean;
  } = {},
) {
  const passes = {
    findOwnedTarget: vi.fn().mockResolvedValue('target' in options ? options.target : target),
    reserve: vi
      .fn()
      .mockResolvedValue(options.reservation ?? { outcome: 'RESERVED', pass: { id: 'pass-1' } }),
    complete: vi.fn().mockResolvedValue(undefined),
    countToday: vi.fn().mockResolvedValue(1),
  };
  const generation = {
    preview: options.fail
      ? vi.fn().mockRejectedValue(new Error('upstream'))
      : vi.fn().mockResolvedValue(
          options.reply ?? {
            status: 'FORMATTED',
            code: null,
            markdown: '# Solar costs\n\n- A point [a1b2c3d4].',
            citations,
          },
        ),
  };
  const service = new PublicationFormatService(passes as never, generation as never);
  return { service, passes, generation };
}

describe('PublicationFormatService', () => {
  it('previews for the owner and keeps the passes left', async () => {
    const { service, passes, generation } = make();
    const result = await service.preview('pub-1', 'owner-1', dto);
    expect(passes.findOwnedTarget).toHaveBeenCalledWith('pub-1', 'owner-1');
    expect(generation.preview).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1', parentJobId: 'job-1', title: 'Solar costs' }),
    );
    expect(result).toMatchObject({ revisionId: 'rev-1', status: 'FORMATTED', remainingToday: 2 });
    expect(passes.complete).toHaveBeenCalledWith(
      'pass-1',
      expect.objectContaining({ status: 'FORMATTED' }),
    );
  });

  it("answers 404 for another owner's or a missing Thread, before any pass or model call", async () => {
    const { service, passes, generation } = make({ target: null });
    await expect(service.preview('pub-1', 'intruder', dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(passes.reserve).not.toHaveBeenCalled();
    expect(generation.preview).not.toHaveBeenCalled();
  });

  it('refuses the fourth pass of the day with a coded 429', async () => {
    const { service, generation } = make({ reservation: { outcome: 'LIMIT', used: 3 } });
    const error = await service.preview('pub-1', 'owner-1', dto).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: 'THREAD_FORMAT_DAILY_LIMIT',
      limit: 3,
    });
    expect(generation.preview).not.toHaveBeenCalled();
  });

  it('is idempotent: a replayed key returns the stored preview without a model call', async () => {
    const { service, generation } = make({
      reservation: {
        outcome: 'REPLAY',
        pass: {
          id: 'pass-1',
          revisionId: 'rev-1',
          status: 'FORMATTED',
          code: null,
          resultMarkdown: '# Solar costs\n\n- stored',
        },
      },
    });
    const result = await service.preview('pub-1', 'owner-1', dto);
    expect(result.markdown).toBe('# Solar costs\n\n- stored');
    expect(generation.preview).not.toHaveBeenCalled();
  });

  it('answers 409 while the same key is still running', async () => {
    const { service } = make({
      reservation: {
        outcome: 'REPLAY',
        pass: { id: 'p', revisionId: 'r', status: 'PENDING', code: null, resultMarkdown: null },
      },
    });
    await expect(service.preview('pub-1', 'owner-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('marks the pass FAILED (not counted) when the generation service fails', async () => {
    const { service, passes } = make({ fail: true });
    await expect(service.preview('pub-1', 'owner-1', dto)).rejects.toThrow('upstream');
    expect(passes.complete).toHaveBeenCalledWith(
      'pass-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('refuses a Thread that has no generation behind it', async () => {
    const { service } = make({ target: { ...target, generationJobId: null as never } });
    await expect(service.preview('pub-1', 'owner-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reports a skipped pass as unchanged text', async () => {
    const { service } = make({
      reply: {
        status: 'SKIPPED',
        code: 'FORMAT_ALREADY_PRETTY',
        markdown: target.markdown,
        citations,
      },
    });
    const result = await service.preview('pub-1', 'owner-1', dto);
    expect(result).toMatchObject({ status: 'SKIPPED', code: 'FORMAT_ALREADY_PRETTY' });
  });
});

describe('formatPublicationSchema', () => {
  it('requires a key and rejects extra fields (no owner id from the client)', () => {
    expect(formatPublicationSchema.safeParse(dto).success).toBe(true);
    expect(formatPublicationSchema.safeParse({ ...dto, ownerId: 'x' }).success).toBe(false);
    expect(formatPublicationSchema.safeParse({ correlationId: 'c' }).success).toBe(false);
  });
});
