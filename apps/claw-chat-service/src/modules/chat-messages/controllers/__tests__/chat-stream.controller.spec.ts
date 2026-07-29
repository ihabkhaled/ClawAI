import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../../../common/enums';
import { ChatStreamController } from '../chat-stream.controller';
import { ChatStreamService } from '../../services/chat-stream.service';
import { StreamControlService } from '../../services/stream-control.service';

describe('ChatStreamController', () => {
  it('honors replay=false so a reused thread starts with the next live event', async () => {
    const streamService = new ChatStreamService();
    streamService.emitCompletion('thread-reused', 'OLLAMA', 'gemma3:4b');
    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        {
          provide: StreamControlService,
          useValue: {
            assertOwnership: jest.fn(async (): Promise<void> => {}),
            cancelStream: jest.fn(),
          },
        },
      ],
    }).compile();
    const controller = module.get(ChatStreamController);
    const nextEvent = firstValueFrom(
      controller.stream(
        'thread-reused',
        { id: 'user-1', email: 'user@example.com', role: UserRole.OPERATOR },
        false,
      ),
    );

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    streamService.emitProviderSelected('thread-reused', 'OLLAMA', 'qwen3:1.7b');

    await expect(nextEvent).resolves.toMatchObject({
      data: expect.stringContaining('"model":"qwen3:1.7b"'),
    });
  });
});
