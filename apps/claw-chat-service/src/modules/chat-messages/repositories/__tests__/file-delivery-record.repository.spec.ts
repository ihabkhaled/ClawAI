import { FileDeliveryRecordRepository } from '../file-delivery-record.repository';
import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { type FileDeliveryRecordInput } from '../../types/file-delivery-record.types';

type PrismaMock = {
  fileDeliveryRecord: {
    createMany: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};

const buildPrismaMock = (): PrismaMock => ({
  fileDeliveryRecord: {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
});

const buildRecord = (
  overrides: Partial<FileDeliveryRecordInput> = {},
): FileDeliveryRecordInput => ({
  messageId: 'msg-1',
  threadId: 'thread-1',
  userId: 'user-1',
  fileId: 'file-1',
  filename: 'test.png',
  mimeType: 'image/png',
  provider: 'OPENAI',
  model: 'gpt-4o',
  mode: FileDeliveryMode.NATIVE_IMAGE,
  supportsVision: true,
  ...overrides,
});

describe('FileDeliveryRecordRepository', () => {
  let prisma: PrismaMock;
  let repository: FileDeliveryRecordRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // Cast to unknown then to PrismaService for type-safety with the constructor.
    repository = new FileDeliveryRecordRepository(prisma as unknown as never);
  });

  describe('createMany', () => {
    it('passes records[] to prisma.fileDeliveryRecord.createMany with skipDuplicates: true', async () => {
      const records = [
        buildRecord(),
        buildRecord({
          fileId: 'file-2',
          filename: 'doc.pdf',
          mode: FileDeliveryMode.EXTRACTED_TEXT,
        }),
      ];
      await repository.createMany(records);

      expect(prisma.fileDeliveryRecord.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.fileDeliveryRecord.createMany).toHaveBeenCalledWith({
        data: records,
        skipDuplicates: true,
      });
    });

    it('does NOT call prisma when the input array is empty', async () => {
      await repository.createMany([]);
      expect(prisma.fileDeliveryRecord.createMany).not.toHaveBeenCalled();
    });

    it('propagates prisma errors so the service can log and rethrow', async () => {
      prisma.fileDeliveryRecord.createMany.mockRejectedValueOnce(new Error('db down'));
      await expect(repository.createMany([buildRecord()])).rejects.toThrow('db down');
    });
  });

  describe('findByMessageId', () => {
    it('queries prisma with where { messageId } and orders by createdAt asc', async () => {
      const rows = [{ id: 'r-1' }];
      prisma.fileDeliveryRecord.findMany.mockResolvedValueOnce(rows);

      const result = await repository.findByMessageId('msg-42');

      expect(prisma.fileDeliveryRecord.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.fileDeliveryRecord.findMany).toHaveBeenCalledWith({
        where: { messageId: 'msg-42' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('deleteByMessageId', () => {
    it('calls prisma.fileDeliveryRecord.deleteMany with where { messageId }', async () => {
      await repository.deleteByMessageId('msg-7');

      expect(prisma.fileDeliveryRecord.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.fileDeliveryRecord.deleteMany).toHaveBeenCalledWith({
        where: { messageId: 'msg-7' },
      });
    });
  });
});
