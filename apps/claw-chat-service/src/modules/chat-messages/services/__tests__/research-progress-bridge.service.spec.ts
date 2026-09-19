import { vi } from 'vitest';
import { RESEARCH_CRAWL_PROGRESS_CHANNEL } from '@claw/shared-constants';

import { AiStreamStage } from '../../../../common/enums';
import { ResearchProgressBridgeService } from '../research-progress-bridge.service';
import type { ChatStreamService } from '../chat-stream.service';

type MessageHandler = (channel: string, payload: string) => void;

function build() {
  let messageHandler: MessageHandler | null = null;
  const subscriber = {
    subscribe: vi.fn(() => Promise.resolve()),
    onMessage: vi.fn((handler: MessageHandler) => {
      messageHandler = handler;
    }),
    onReady: vi.fn(),
  };
  const emitResearchProgress = vi.fn();
  const chatStreamService = { emitResearchProgress } as unknown as ChatStreamService;
  const append = vi.fn((_threadId: string, _entry: unknown, _dedupeKey?: string) =>
    Promise.resolve(),
  );
  const service = new ResearchProgressBridgeService(subscriber as never, chatStreamService, {
    append,
  } as never);
  return {
    service,
    subscriber,
    emitResearchProgress,
    append,
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

  it('forwards a well-formed page tick to the correlationId thread as CRAWL_READING_PAGE', async () => {
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
        stage: AiStreamStage.CRAWL_READING_PAGE,
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

  // Every chat replica receives each tick. The payload is the dedupe key, so
  // all replicas propose the same entry and only the first one logs it.
  it('logs a page tick into the narration, keyed so only one replica keeps it', async () => {
    const harness = build();
    await harness.service.onModuleInit();
    const payload = JSON.stringify({
      correlationId: 'thread-1',
      phase: 'page',
      message: 'Fetched https://example.com/pricing',
      pagesFetched: 3,
      pagesDiscovered: 12,
      timestamp: '2026-09-19T10:00:00.000Z',
    });

    harness.deliver(payload);
    harness.deliver(payload);

    expect(harness.append).toHaveBeenCalledTimes(2);
    const [first, second] = harness.append.mock.calls;
    expect(first?.[1]).toMatchObject({ kind: 'crawl_progress', params: { pagesFetched: 3 } });
    expect(first?.[2]).toBe(second?.[2]);
  });

  it('does not narrate the start and finish, which the orchestrator reports with what was read', async () => {
    const harness = build();
    await harness.service.onModuleInit();
    harness.deliver(
      JSON.stringify({
        correlationId: 't',
        phase: 'started',
        message: 'x',
        pagesFetched: 0,
        pagesDiscovered: 0,
      }),
    );
    expect(harness.append).not.toHaveBeenCalled();
  });
});
