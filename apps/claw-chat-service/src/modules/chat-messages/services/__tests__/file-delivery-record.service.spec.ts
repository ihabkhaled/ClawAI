import { FileDeliveryRecordService } from '../file-delivery-record.service';
import { type FileDeliveryRecordRepository } from '../../repositories/file-delivery-record.repository';
import { type ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import { BusinessException, EntityNotFoundException } from '../../../../common/errors';
import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { type FileDeliveryRecordInput } from '../../types/file-delivery-record.types';

const buildRepo = (): Record<keyof FileDeliveryRecordRepository, jest.Mock> => ({
  createMany: jest.fn().mockImplementation(async () => {}),
  findByMessageId: jest.fn().mockResolvedValue([]),
  findByThreadId: jest.fn().mockResolvedValue([]),
  deleteByMessageId: jest.fn().mockImplementation(async () => {}),
});

const buildMessagesRepo = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  findById: jest.fn(),
});

const buildThreadsRepo = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  findById: jest.fn(),
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

describe('FileDeliveryRecordService', () => {
  let repo: ReturnType<typeof buildRepo>;
  let messagesRepo: ReturnType<typeof buildMessagesRepo>;
  let threadsRepo: ReturnType<typeof buildThreadsRepo>;
  let service: FileDeliveryRecordService;

  beforeEach(() => {
    repo = buildRepo();
    messagesRepo = buildMessagesRepo();
    threadsRepo = buildThreadsRepo();
    service = new FileDeliveryRecordService(
      repo as unknown as FileDeliveryRecordRepository,
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
    );
  });

  describe('recordDeliveries', () => {
    it('calls repo.createMany once with the N records', async () => {
      const records = [
        buildRecord(),
        buildRecord({ fileId: 'file-2', mode: FileDeliveryMode.EXTRACTED_TEXT }),
        buildRecord({ fileId: 'file-3', mode: FileDeliveryMode.OMITTED_NO_VISION }),
      ];

      await service.recordDeliveries(records);

      expect(repo.createMany).toHaveBeenCalledTimes(1);
      expect(repo.createMany).toHaveBeenCalledWith(records);
    });

    it('short-circuits when the input is empty (no repo call)', async () => {
      await service.recordDeliveries([]);
      expect(repo.createMany).not.toHaveBeenCalled();
    });

    it('logs the error and rethrows when the repo throws', async () => {
      const err = new Error('db boom');
      repo.createMany.mockRejectedValueOnce(err);
      // Silence the expected logger.error
      const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.recordDeliveries([buildRecord()])).rejects.toThrow('db boom');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getDeliveriesForMessage', () => {
    const messageId = 'msg-1';
    const threadId = 'thread-1';
    const userId = 'user-1';

    it('returns repo.findByMessageId result when the message belongs to the user', async () => {
      messagesRepo.findById!.mockResolvedValueOnce({ id: messageId, threadId });
      threadsRepo.findById!.mockResolvedValueOnce({ id: threadId, userId });
      const rows = [{ id: 'fdr-1' }, { id: 'fdr-2' }];
      repo.findByMessageId.mockResolvedValueOnce(rows);

      const result = await service.getDeliveriesForMessage(messageId, userId);

      expect(messagesRepo.findById).toHaveBeenCalledWith(messageId);
      expect(threadsRepo.findById).toHaveBeenCalledWith(threadId);
      expect(repo.findByMessageId).toHaveBeenCalledWith(messageId);
      expect(result).toBe(rows);
    });

    it('throws FORBIDDEN BusinessException when the message belongs to another user', async () => {
      messagesRepo.findById!.mockResolvedValueOnce({ id: messageId, threadId });
      threadsRepo.findById!.mockResolvedValueOnce({ id: threadId, userId: 'other-user' });
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.getDeliveriesForMessage(messageId, userId)).rejects.toMatchObject({
        code: 'FORBIDDEN_MESSAGE_ACCESS',
      });
      await expect(service.getDeliveriesForMessage(messageId, userId)).rejects.toBeInstanceOf(
        BusinessException,
      );

      expect(repo.findByMessageId).not.toHaveBeenCalled();
    });

    it("throws EntityNotFoundException when the message doesn't exist", async () => {
      messagesRepo.findById!.mockResolvedValueOnce(null);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.getDeliveriesForMessage(messageId, userId)).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
      expect(threadsRepo.findById).not.toHaveBeenCalled();
      expect(repo.findByMessageId).not.toHaveBeenCalled();
    });

    it('throws EntityNotFoundException when the parent thread is missing', async () => {
      messagesRepo.findById!.mockResolvedValueOnce({ id: messageId, threadId });
      threadsRepo.findById!.mockResolvedValueOnce(null);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.getDeliveriesForMessage(messageId, userId)).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
      expect(repo.findByMessageId).not.toHaveBeenCalled();
    });

    it('propagates the rejection when the underlying repo throws', async () => {
      messagesRepo.findById!.mockResolvedValueOnce({ id: messageId, threadId });
      threadsRepo.findById!.mockResolvedValueOnce({ id: threadId, userId });
      const repoErr = new Error('query failed');
      repo.findByMessageId.mockRejectedValueOnce(repoErr);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.getDeliveriesForMessage(messageId, userId)).rejects.toThrow(
        'query failed',
      );
    });
  });
});
