import { RESEARCH_CRAWL_PROGRESS_CHANNEL } from '@claw/shared-constants';

import { AiStreamStage } from '../../../../common/enums';
import { ResearchProgressBridgeService } from '../research-progress-bridge.service';
import type { ChatStreamService } from '../chat-stream.service';

type MessageHandler = (channel: string, payload: string) => void;

function build() {
  let messageHandler: MessageHandler | null = null;
  const subscriber = {
    subscribe: jest.fn(() => Promise.resolve()),
    onMessage: jest.fn((handler: MessageHandler) => {
      messageHandler = handler;
    }),
    onReady: jest.fn(),
  };
  const emitResearchProgress = jest.fn();
  const chatStreamService = { emitResearchProgress } as unknown as ChatStreamService;
  const service = new ResearchProgressBridgeService(subscriber as never, chatStreamService);
  return {
    service,
    subscriber,
    emitResearchProgress,
    deliver: (payload: string) => messageHandler?.(RESEARCH_CRAWL_PROGRESS_CHANNEL, payload),
    deliverOnOtherChannel: (payload: string) => messageHandler?.('some:other:channel', payload),
  };
}

/**
 * research-service and chat-service are separate processes sharing one Redis
 * instance (ADR-092 amendment). This is the read-only half of that bridge —
 * StreamCancellationService already proved the write-and-broadcast half for
 * Stop, so this suite focuses on what is unique here: parsing an
 * externally-published payload and never letting a malformed one crash the
 * subscriber loop that every other thread's progress also flows through.
 */
describe('ResearchProgressBridgeService', () => {
  it('subscribes to the crawl progress channel on init', async () => {
    const { service, subscriber } = build();

    await service.onModuleInit();

    expect(subscriber.subscribe).toHaveBeenCalledWith(RESEARCH_CRAWL_PROGRESS_CHANNEL);
  });

  it('forwards a well-formed page tick to the correlationId thread as RESEARCH_FETCHING', async () => {
    const { service, emitResearchProgress, deliver } = build();
    await service.onModuleInit();

    deliver(
      JSON.stringify({
        correlationId: 'thread-1',
        phase: 'page',
        message: 'Fetched https://example.com/about',
        pagesFetched: 2,
        pagesDiscovered: 5,
        timestamp: new Date().toISOString(),
      }),
    );

    expect(emitResearchProgress).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({
        stage: AiStreamStage.RESEARCH_FETCHING,
        description: 'Fetched https://example.com/about',
      }),
    );
  });

  it('ignores a message published on a different channel', async () => {
    const { service, emitResearchProgress, deliverOnOtherChannel } = build();
    await service.onModuleInit();

    deliverOnOtherChannel(JSON.stringify({ correlationId: 'thread-1', phase: 'page' }));

    expect(emitResearchProgress).not.toHaveBeenCalled();
  });

  it('drops a payload that is not valid JSON without throwing', async () => {
    const { service, emitResearchProgress, deliver } = build();
    await service.onModuleInit();

    expect(() => {
      deliver('not json{{{');
    }).not.toThrow();
    expect(emitResearchProgress).not.toHaveBeenCalled();
  });

  it('drops a payload missing correlationId without throwing', async () => {
    const { service, emitResearchProgress, deliver } = build();
    await service.onModuleInit();

    deliver(JSON.stringify({ phase: 'page', message: 'x' }));

    expect(emitResearchProgress).not.toHaveBeenCalled();
  });
});
