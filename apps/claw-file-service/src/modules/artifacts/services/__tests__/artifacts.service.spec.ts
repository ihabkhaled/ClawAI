import { createHash } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { BusinessException } from '../../../../common/errors';
import { MAX_ARTIFACT_BYTES } from '../../constants/artifact.constants';
import { ArtifactErrorCode } from '../../enums/artifact-error-code.enum';
import { PublishedArtifactsRepository } from '../../repositories/published-artifacts.repository';
import { ArtifactsService } from '../artifacts.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ PUBLIC_SITE_URL: 'https://claw.example/' })) },
}));

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

const createdAt = new Date('2026-09-30T00:00:00Z');

function makeRepository(): {
  create: ReturnType<typeof vi.fn>;
  findByPublicId: ReturnType<typeof vi.fn>;
  findByUser: ReturnType<typeof vi.fn>;
  countByUser: ReturnType<typeof vi.fn>;
  deleteOwned: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(
      async (data: {
        publicId: string;
        title: string | null;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
      }) => ({
        id: 'art_1',
        publicId: data.publicId,
        title: data.title,
        filename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        createdAt,
      }),
    ),
    findByPublicId: vi.fn(),
    findByUser: vi.fn(),
    countByUser: vi.fn(),
    deleteOwned: vi.fn(),
  };
}

async function expectRefusal(
  promise: Promise<unknown>,
  code: ArtifactErrorCode,
  status: HttpStatus,
): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  if (!(error instanceof BusinessException)) return;
  expect(error.code).toBe(code);
  expect(error.getStatus()).toBe(status);
}

describe('ArtifactsService', () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: ArtifactsService;

  beforeEach(async () => {
    repository = makeRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        { provide: PublishedArtifactsRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ArtifactsService);
  });

  describe('publish', () => {
    const content = '# Report\n\nAll good.';
    const dto = {
      filename: 'report.md',
      mimeType: 'text/markdown' as const,
      content,
      sha256: sha(content),
    };

    it('stores the artifact under a random public id and returns an absolute public url', async () => {
      const result = await service.publish('user_1', { ...dto, title: 'Weekly' }, false);

      expect(repository.create).toHaveBeenCalledTimes(1);
      const stored = repository.create.mock.calls[0]?.[0] as {
        publicId: string;
        userId: string;
        sizeBytes: number;
        title: string | null;
      };
      expect(stored.userId).toBe('user_1');
      expect(stored.title).toBe('Weekly');
      expect(stored.sizeBytes).toBe(Buffer.byteLength(content, 'utf8'));
      expect(stored.publicId).toMatch(/^[A-Za-z0-9_-]{32}$/u);
      expect(result.id).toBe('art_1');
      expect(result.url).toBe(`https://claw.example/api/v1/public/artifacts/${stored.publicId}`);
      expect(result).not.toHaveProperty('content');
    });

    it('defaults a missing title to null', async () => {
      await service.publish('user_1', dto, false);
      const stored = repository.create.mock.calls[0]?.[0] as { title: string | null };
      expect(stored.title).toBeNull();
    });

    it('gives two publications different public ids', async () => {
      const first = await service.publish('user_1', dto, false);
      const second = await service.publish('user_1', dto, false);
      expect(first.publicId).not.toBe(second.publicId);
    });

    it('refuses with 409 when zero data retention is on, before storing anything', async () => {
      await expectRefusal(
        service.publish('user_1', dto, true),
        ArtifactErrorCode.ZERO_RETENTION,
        HttpStatus.CONFLICT,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses content over 1 MiB of UTF-8 with 413, measured in bytes not characters', async () => {
      // 524,289 two-byte characters: under the cap in characters, over it in bytes.
      const big = 'é'.repeat(MAX_ARTIFACT_BYTES / 2 + 1);
      await expectRefusal(
        service.publish('user_1', { ...dto, content: big, sha256: sha(big) }, false),
        ArtifactErrorCode.TOO_LARGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts content exactly at the cap', async () => {
      const exact = 'a'.repeat(MAX_ARTIFACT_BYTES);
      await service.publish('user_1', { ...dto, content: exact, sha256: sha(exact) }, false);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('refuses binary content (NUL byte) with 422', async () => {
      const binary = 'abc\u0000def';
      await expectRefusal(
        service.publish('user_1', { ...dto, content: binary, sha256: sha(binary) }, false),
        ArtifactErrorCode.NOT_TEXT,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });

    it('refuses a sha256 that does not match the content with 400', async () => {
      await expectRefusal(
        service.publish('user_1', { ...dto, sha256: sha('something else') }, false),
        ArtifactErrorCode.HASH_MISMATCH,
        HttpStatus.BAD_REQUEST,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses content carrying a credential with 422 and never stores it', async () => {
      const leaked = `config:\nAWS_KEY=AKIA${'A'.repeat(16)}\n`;
      await expectRefusal(
        service.publish('user_1', { ...dto, content: leaked, sha256: sha(leaked) }, false),
        ArtifactErrorCode.CONTAINS_SECRET,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts text the extension already redacted', async () => {
      const scrubbed = 'password = [REDACTED]\napi_key: ***';
      await service.publish('user_1', { ...dto, content: scrubbed, sha256: sha(scrubbed) }, false);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('returns the caller page with urls and pagination meta', async () => {
      repository.findByUser.mockResolvedValue([
        {
          id: 'a',
          publicId: 'p'.repeat(32),
          title: null,
          filename: 'a.txt',
          mimeType: 'text/plain',
          sizeBytes: 3,
          sha256: 'x',
          createdAt,
        },
      ]);
      repository.countByUser.mockResolvedValue(41);

      const result = await service.list('user_1', 2, 20);

      expect(repository.findByUser).toHaveBeenCalledWith('user_1', 2, 20);
      expect(repository.countByUser).toHaveBeenCalledWith('user_1');
      expect(result.meta).toEqual({ total: 41, page: 2, limit: 20, totalPages: 3 });
      expect(result.data[0]?.url).toBe(
        `https://claw.example/api/v1/public/artifacts/${'p'.repeat(32)}`,
      );
    });
  });

  describe('remove', () => {
    it('deletes an owned artifact', async () => {
      repository.deleteOwned.mockResolvedValue(1);
      await service.remove('user_1', 'art_1');
      expect(repository.deleteOwned).toHaveBeenCalledWith('art_1', 'user_1');
    });

    it('answers 404 for an artifact the caller does not own', async () => {
      repository.deleteOwned.mockResolvedValue(0);
      await expectRefusal(
        service.remove('user_2', 'art_1'),
        ArtifactErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('readPublic', () => {
    it('returns the stored content', async () => {
      repository.findByPublicId.mockResolvedValue({ content: '<script>alert(1)</script>' });
      await expect(service.readPublic('p'.repeat(32))).resolves.toBe('<script>alert(1)</script>');
    });

    it('answers 404 for an unknown or deleted public id', async () => {
      repository.findByPublicId.mockResolvedValue(null);
      await expectRefusal(
        service.readPublic('p'.repeat(32)),
        ArtifactErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
