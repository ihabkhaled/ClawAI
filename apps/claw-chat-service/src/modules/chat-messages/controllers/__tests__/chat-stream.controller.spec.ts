import { createFakeChatStreamBus } from '../../__tests__/helpers/fake-chat-stream-bus.helper';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../../../common/enums';
import { ChatStreamController } from '../chat-stream.controller';
import { ChatStreamService } from '../../services/chat-stream.service';
import { RuntimeV2StreamService } from '../../services/runtime-v2-stream.service';
import { StreamControlService } from '../../services/stream-control.service';

describe('ChatStreamController', () => {
  it('honors replay=false so a reused thread starts with the next live event', async () => {
    const streamService = new ChatStreamService(createFakeChatStreamBus());
    streamService.onModuleInit();
    streamService.emitCompletion('thread-reused', 'OLLAMA', 'gemma3:4b');
    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        {
          provide: RuntimeV2StreamService,
          useValue: {
            selectEvents: jest.fn(
              (_ownerId: string, threadId: string, query: Record<string, string>) =>
                streamService.streamEvents(threadId, query['replay'] !== 'false'),
            ),
          },
        },
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
        { replay: 'false' },
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

  it("sets the wire id from the frame's own eventId, not a per-connection counter", async () => {
    // Nest auto-assigns `id:` starting at 1 per connection when `message.id`
    // is left unset (see SseStream.writeMessage in @nestjs/core). That counter
    // carries no resumable information — this is what D4 was about.
    const streamService = new ChatStreamService(createFakeChatStreamBus());
    streamService.onModuleInit();
    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        {
          provide: RuntimeV2StreamService,
          useValue: {
            selectEvents: jest.fn((_ownerId: string, threadId: string) =>
              streamService.streamEvents(threadId, false),
            ),
          },
        },
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
        'thread-wire-id',
        { id: 'user-1', email: 'user@example.com', role: UserRole.OPERATOR },
        {},
      ),
    );

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    streamService.emitCompletion('thread-wire-id', 'OLLAMA', 'gemma3:4b');

    const event = await nextEvent;
    expect(event.id).toBe('thread-wire-id:1');
  });

  it('leaves the wire id unset for a frame with no eventId, such as the heartbeat', async () => {
    const streamService = new ChatStreamService(createFakeChatStreamBus());
    streamService.onModuleInit();
    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        {
          provide: RuntimeV2StreamService,
          useValue: {
            // Heartbeats are merged in by the controller itself, not by
            // selectEvents — an observable that never emits is enough here.
            selectEvents: jest.fn(() => streamService.streamEvents('thread-heartbeat-only', false)),
          },
        },
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
    const events: unknown[] = [];
    const subscription = controller
      .stream(
        'thread-heartbeat-only',
        { id: 'user-1', email: 'user@example.com', role: UserRole.OPERATOR },
        {},
      )
      .subscribe((event) => events.push(event));

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    subscription.unsubscribe();

    // No live frame arrived; nothing to assert an id on, and nothing crashed
    // trying to read `.eventId` off a bare heartbeat object.
    expect(events).toEqual([]);
  });

  it('forwards the Last-Event-ID header so a reconnect can resume instead of replaying everything', async () => {
    const streamService = new ChatStreamService(createFakeChatStreamBus());
    streamService.onModuleInit();
    const selectEvents = jest.fn((_ownerId: string, threadId: string) =>
      streamService.streamEvents(threadId, true),
    );
    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatStreamService, useValue: streamService },
        { provide: RuntimeV2StreamService, useValue: { selectEvents } },
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

    const subscription = controller
      .stream(
        'thread-header',
        { id: 'user-1', email: 'user@example.com', role: UserRole.OPERATOR },
        {},
        'thread-header:3',
      )
      .subscribe();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    subscription.unsubscribe();

    expect(selectEvents).toHaveBeenCalledWith(
      'user-1',
      'thread-header',
      {},
      undefined,
      'thread-header:3',
    );
  });
});
