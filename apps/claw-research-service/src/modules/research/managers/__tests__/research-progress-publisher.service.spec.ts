import { RESEARCH_CRAWL_PROGRESS_CHANNEL } from '@claw/shared-constants';

import { ResearchProgressPublisher } from '../research-progress-publisher.service';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';

/**
 * Fire-and-forget by design (matches `ChatStreamBusService.publish()`): the
 * crawl itself must never fail because a progress tick could not be sent, so
 * every failure path here asserts the crawl-facing call still resolves.
 */
describe('ResearchProgressPublisher', () => {
  let publish: jest.Mock;
  let publisher: ResearchProgressPublisher;

  beforeEach(() => {
    publish = jest.fn().mockResolvedValue(undefined);
    publisher = new ResearchProgressPublisher({ publish } as unknown as RedisService);
  });

  it('does nothing when correlationId is undefined', () => {
    publisher.publish(undefined, 'started', 'Starting crawl', 0, 0);

    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes a JSON-encoded message on the shared crawl-progress channel', () => {
    publisher.publish('thread-1', 'page', 'Fetched https://example.com/about', 3, 10);

    expect(publish).toHaveBeenCalledTimes(1);
    const [channel, body] = publish.mock.calls[0] as [string, string];
    expect(channel).toBe(RESEARCH_CRAWL_PROGRESS_CHANNEL);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      correlationId: 'thread-1',
      phase: 'page',
      message: 'Fetched https://example.com/about',
      pagesFetched: 3,
      pagesDiscovered: 10,
    });
    expect(typeof parsed['timestamp']).toBe('string');
  });

  it('swallows a publish failure without throwing', () => {
    publish.mockRejectedValue(new Error('redis unreachable'));

    expect(() => {
      publisher.publish('thread-1', 'completed', 'Crawl complete', 5, 5);
    }).not.toThrow();
  });
});
