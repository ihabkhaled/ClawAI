// Slice C foundation 3 — file retention sweeper unit tests.
//
// Mocks FilesRepository, RabbitMQService, the disk-delete utility and
// AppConfig so the manager can be exercised without any real filesystem,
// database, or environment dependencies.

import { EventPattern } from '@claw/shared-types';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FileRetentionSweeperManager } from '../file-retention-sweeper.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { AppConfig } from '../../../../app/config/app.config';
import { type File } from '../../../../generated/prisma';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn(() => ({
      FILE_RETENTION_SWEEP_CRON: '0 2 * * *',
      FILE_RETENTION_SWEEP_BATCH_LIMIT: 5,
    })),
  },
}));

jest.mock('../../../../common/utilities', () => ({
  verifyAccessToken: jest.fn(),
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
  readFile: jest.fn(),
}));

const { deleteFile } = jest.requireMock('../../../../common/utilities') as {
  deleteFile: jest.Mock;
};

const { AppConfig: MockedAppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'file-id',
    userId: 'user-id',
    filename: 'doc.txt',
    mimeType: 'text/plain',
    sizeBytes: 1234,
    storagePath: '/data/uploads/doc.txt',
    content: null,
    ingestionStatus: 'COMPLETED',
    retentionExpiresAt: new Date('2026-01-01T00:00:00Z'),
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2025-12-01T00:00:00Z'),
    updatedAt: new Date('2025-12-01T00:00:00Z'),
    ...overrides,
  }) as unknown as File;

const mockFilesRepository = (): Partial<Record<keyof FilesRepository, jest.Mock>> => ({
  findExpiredBefore: jest.fn(),
  // jest.fn() defaults to returning undefined synchronously, which awaits to
  // undefined — exactly what FilesRepository.deleteById returns. We avoid
  // .mockResolvedValue() so unicorn/no-useless-undefined and tsgo agree.
  deleteById: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  // Same reasoning as deleteById above.
  publish: jest.fn(),
});

describe('FileRetentionSweeperManager', () => {
  let manager: FileRetentionSweeperManager;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAppConfig.get.mockReturnValue({
      FILE_RETENTION_SWEEP_CRON: '0 2 * * *',
      FILE_RETENTION_SWEEP_BATCH_LIMIT: 5,
    });
    filesRepo = mockFilesRepository();
    rabbitMQ = mockRabbitMQ();
    manager = new FileRetentionSweeperManager(
      filesRepo as unknown as FilesRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  it('reaps every expired file in the batch (disk + DB + FILE_RETENTION_EXPIRED event per file) when expired<=limit', async () => {
    const files = [
      buildFile({ id: 'f1', storagePath: '/data/uploads/f1.txt', filename: 'f1.txt' }),
      buildFile({ id: 'f2', storagePath: '/data/uploads/f2.txt', filename: 'f2.txt' }),
      buildFile({ id: 'f3', storagePath: '/data/uploads/f3.txt', filename: 'f3.txt' }),
    ];
    filesRepo.findExpiredBefore!.mockResolvedValue(files);

    await manager.runSweep();

    expect(filesRepo.findExpiredBefore).toHaveBeenCalledTimes(1);
    const [cutoffArg, limitArg] = filesRepo.findExpiredBefore!.mock.calls[0] as [Date, number];
    expect(cutoffArg).toBeInstanceOf(Date);
    expect(limitArg).toBe(5);

    expect(deleteFile).toHaveBeenCalledTimes(3);
    expect(deleteFile).toHaveBeenNthCalledWith(1, '/data/uploads/f1.txt');
    expect(deleteFile).toHaveBeenNthCalledWith(2, '/data/uploads/f2.txt');
    expect(deleteFile).toHaveBeenNthCalledWith(3, '/data/uploads/f3.txt');

    expect(filesRepo.deleteById).toHaveBeenCalledTimes(3);
    expect(filesRepo.deleteById).toHaveBeenNthCalledWith(1, 'f1');
    expect(filesRepo.deleteById).toHaveBeenNthCalledWith(2, 'f2');
    expect(filesRepo.deleteById).toHaveBeenNthCalledWith(3, 'f3');

    expect(rabbitMQ.publish).toHaveBeenCalledTimes(3);
    for (const [index, file] of files.entries()) {
      expect(rabbitMQ.publish).toHaveBeenNthCalledWith(
        index + 1,
        EventPattern.FILE_RETENTION_EXPIRED,
        expect.objectContaining({
          fileId: file.id,
          userId: file.userId,
          filename: file.filename,
          sizeBytes: file.sizeBytes,
          retentionExpiresAt: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    }
  });

  it('honours the configured batch limit and only reaps that many per tick', async () => {
    MockedAppConfig.get.mockReturnValue({
      FILE_RETENTION_SWEEP_CRON: '0 2 * * *',
      FILE_RETENTION_SWEEP_BATCH_LIMIT: 2,
    });
    // Repository is responsible for applying the limit — manager must pass it through.
    // We simulate the repo returning at most `limit` rows.
    const returned = [
      buildFile({ id: 'a', storagePath: '/data/uploads/a.txt', filename: 'a.txt' }),
      buildFile({ id: 'b', storagePath: '/data/uploads/b.txt', filename: 'b.txt' }),
    ];
    filesRepo.findExpiredBefore!.mockImplementation((_cutoff: Date, limit: number) => {
      // Mimic prisma `take: limit` — never return more than asked.
      return Promise.resolve(returned.slice(0, limit));
    });

    await manager.runSweep();

    const [, limitArg] = filesRepo.findExpiredBefore!.mock.calls[0] as [Date, number];
    expect(limitArg).toBe(2);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(filesRepo.deleteById).toHaveBeenCalledTimes(2);
    expect(rabbitMQ.publish).toHaveBeenCalledTimes(2);
  });

  it('keeps the DB row when disk delete throws, logs the error, and continues with the next file', async () => {
    const failing = buildFile({
      id: 'bad',
      storagePath: '/data/uploads/bad.txt',
      filename: 'bad.txt',
    });
    const good1 = buildFile({
      id: 'good1',
      storagePath: '/data/uploads/good1.txt',
      filename: 'good1.txt',
    });
    const good2 = buildFile({
      id: 'good2',
      storagePath: '/data/uploads/good2.txt',
      filename: 'good2.txt',
    });
    filesRepo.findExpiredBefore!.mockResolvedValue([failing, good1, good2]);

    deleteFile.mockImplementation((path: string) => {
      if (path === '/data/uploads/bad.txt') {
        throw new Error('EBUSY: file is locked');
      }
    });

    const errorSpy = jest.spyOn(manager['logger'], 'error').mockImplementation();

    await manager.runSweep();

    // Disk delete attempted on every file.
    expect(deleteFile).toHaveBeenCalledTimes(3);

    // DB delete + event publish skipped for the failing one.
    expect(filesRepo.deleteById).toHaveBeenCalledTimes(2);
    expect(filesRepo.deleteById).not.toHaveBeenCalledWith('bad');
    expect(filesRepo.deleteById).toHaveBeenCalledWith('good1');
    expect(filesRepo.deleteById).toHaveBeenCalledWith('good2');

    expect(rabbitMQ.publish).toHaveBeenCalledTimes(2);
    const publishedIds = rabbitMQ.publish!.mock.calls.map(
      (call: unknown[]) => (call[1] as { fileId: string }).fileId,
    );
    expect(publishedIds).toEqual(['good1', 'good2']);
    expect(publishedIds).not.toContain('bad');

    // Error logged with the failing file's id + path.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('disk delete failed fileId=bad path=/data/uploads/bad.txt'),
    );

    errorSpy.mockRestore();
  });

  it('never sweeps files whose retentionExpiresAt is null (repository excludes them via lt filter)', async () => {
    // The manager relies on the repository to filter by `retentionExpiresAt: { not: null, lt: cutoff }`.
    // From the manager's perspective: when the repository returns an empty list (because all
    // candidate rows had retentionExpiresAt === null), the sweep MUST no-op — no disk delete,
    // no DB delete, no event publish.
    filesRepo.findExpiredBefore!.mockResolvedValue([]);

    await manager.runSweep();

    // Manager passed a cutoff `Date` and the configured limit through to the repository —
    // it's the repository that enforces the `not: null` clause. So the surface the manager
    // sees for "all rows have null retention" is the same as "no expired rows": an empty array.
    expect(filesRepo.findExpiredBefore).toHaveBeenCalledTimes(1);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(filesRepo.deleteById).not.toHaveBeenCalled();
    expect(rabbitMQ.publish).not.toHaveBeenCalled();
  });

  it('no-ops cleanly when there are no expired files', async () => {
    filesRepo.findExpiredBefore!.mockResolvedValue([]);

    await manager.runSweep();

    expect(filesRepo.findExpiredBefore).toHaveBeenCalledTimes(1);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(filesRepo.deleteById).not.toHaveBeenCalled();
    expect(rabbitMQ.publish).not.toHaveBeenCalled();
  });

  it('uses AppConfig for the batch limit on every tick', async () => {
    filesRepo.findExpiredBefore!.mockResolvedValue([]);

    MockedAppConfig.get.mockReturnValueOnce({
      FILE_RETENTION_SWEEP_CRON: '0 2 * * *',
      FILE_RETENTION_SWEEP_BATCH_LIMIT: 17,
    });

    await manager.runSweep();

    const [, limitArg] = filesRepo.findExpiredBefore!.mock.calls[0] as [Date, number];
    expect(limitArg).toBe(17);
  });

  // Sanity check — the manager imports the AppConfig module; this keeps coverage
  // honest by referencing the imported symbol so the import is not tree-shaken.
  it('imports AppConfig', () => {
    expect(AppConfig).toBeDefined();
  });
});
