import { HttpStatus } from '@nestjs/common';
import { ChatMessagesController } from '../chat-messages.controller';
import { type ChatMessagesService } from '../../services/chat-messages.service';
import { type FileDeliveryRecordService } from '../../services/file-delivery-record.service';
import { BusinessException } from '../../../../common/errors';
import { type AuthenticatedUser } from '../../../../common/types';
import { UserRole } from '../../../../common/enums';

const buildUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'user-1',
  email: 'user1@example.com',
  role: UserRole.OPERATOR,
  ...overrides,
});

describe('ChatMessagesController — GET /chat-messages/:id/file-delivery', () => {
  let chatMessagesService: { [key: string]: jest.Mock };
  let fileDeliveryRecordService: { getDeliveriesForMessage: jest.Mock };
  let controller: ChatMessagesController;

  beforeEach(() => {
    chatMessagesService = {} as { [key: string]: jest.Mock };
    fileDeliveryRecordService = {
      getDeliveriesForMessage: jest.fn(),
    };
    controller = new ChatMessagesController(
      chatMessagesService as unknown as ChatMessagesService,
      fileDeliveryRecordService as unknown as FileDeliveryRecordService,
    );
  });

  it('returns the delivery entries for the authenticated owner', async () => {
    const rows = [
      { id: 'fdr-1', messageId: 'msg-1', provider: 'OPENAI', model: 'gpt-4o' },
      { id: 'fdr-2', messageId: 'msg-1', provider: 'ANTHROPIC', model: 'claude-opus' },
    ];
    fileDeliveryRecordService.getDeliveriesForMessage.mockResolvedValueOnce(rows);

    const user = buildUser({ id: 'user-1' });
    const result = await controller.getFileDelivery('msg-1', user);

    expect(fileDeliveryRecordService.getDeliveriesForMessage).toHaveBeenCalledTimes(1);
    expect(fileDeliveryRecordService.getDeliveriesForMessage).toHaveBeenCalledWith(
      'msg-1',
      'user-1',
    );
    expect(result).toBe(rows);
  });

  it('propagates the service FORBIDDEN BusinessException (403) when the caller is the wrong user', async () => {
    const forbidden = new BusinessException(
      'You do not have access to this message',
      'FORBIDDEN_MESSAGE_ACCESS',
      HttpStatus.FORBIDDEN,
    );
    fileDeliveryRecordService.getDeliveriesForMessage.mockRejectedValueOnce(forbidden);

    const user = buildUser({ id: 'attacker' });
    await expect(controller.getFileDelivery('msg-1', user)).rejects.toMatchObject({
      code: 'FORBIDDEN_MESSAGE_ACCESS',
      status: HttpStatus.FORBIDDEN,
    });
  });
});
