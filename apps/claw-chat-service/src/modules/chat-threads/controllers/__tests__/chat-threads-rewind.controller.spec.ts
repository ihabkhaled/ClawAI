import 'reflect-metadata';
import { vi } from 'vitest';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import { ChatThreadsController } from '../chat-threads.controller';
import { type ChatThreadsService } from '../../services/chat-threads.service';
import { UserRole } from '../../../../common/enums';

describe('ChatThreadsController rewind route', () => {
  const rewindThread = vi.fn().mockResolvedValue({
    threadId: 'thread-1',
    afterMessageId: 'msg-2',
    removedCount: 2,
  });
  const controller = new ChatThreadsController({
    rewindThread,
  } as unknown as ChatThreadsService);

  it('is POST :id/rewind answering 200', () => {
    const handler = ChatThreadsController.prototype.rewind;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/rewind');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
  });

  it('passes the caller, the thread and the pivot to the service', async () => {
    const user = { id: 'user-1', email: 'u@claw.local', role: UserRole.VIEWER };

    await expect(controller.rewind('thread-1', user, { afterMessageId: 'msg-2' })).resolves.toEqual(
      { threadId: 'thread-1', afterMessageId: 'msg-2', removedCount: 2 },
    );
    expect(rewindThread).toHaveBeenCalledWith('user-1', 'thread-1', 'msg-2');
  });
});
