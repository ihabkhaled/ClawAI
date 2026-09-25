import { Logger } from '@nestjs/common';
import { vi, type Mock } from 'vitest';
import { RobotsOutcome } from '../../enums/robots-outcome.enum';
import { RobotsPolicyService } from '../robots-policy.service';
import type { RobotsTxtAdapter } from '../../adapters/robots-txt.adapter';

describe('RobotsPolicyService', () => {
  let adapter: { fetchRobotsTxt: Mock };
  let service: RobotsPolicyService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    adapter = { fetchRobotsTxt: vi.fn() };
    service = new RobotsPolicyService(adapter as unknown as RobotsTxtAdapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function robots(body: string, status = 200): void {
    adapter.fetchRobotsTxt.mockResolvedValue({ status, body, via: 'plain' });
  }

  it('disallows a path our token is disallowed from', async () => {
    robots('User-agent: *\nDisallow: /private/');

    const decision = await service.evaluate('https://example.com/private/page');

    expect(decision.outcome).toBe(RobotsOutcome.DISALLOWED);
    expect(decision.robotsUrl).toBe('https://example.com/robots.txt');
  });

  it('matches the query string too', async () => {
    robots('User-agent: *\nDisallow: /*?session=');

    expect((await service.evaluate('https://example.com/a?session=1')).outcome).toBe(
      RobotsOutcome.DISALLOWED,
    );
    expect((await service.evaluate('https://example.com/a')).outcome).toBe(RobotsOutcome.ALLOWED);
  });

  it('applies a group written for ClawAI-ResearchBot over the wildcard group', async () => {
    robots('User-agent: *\nAllow: /\n\nUser-agent: ClawAI-ResearchBot\nDisallow: /');

    expect((await service.evaluate('https://example.com/a')).outcome).toBe(
      RobotsOutcome.DISALLOWED,
    );
  });

  it('treats a 4xx robots.txt as no rules', async () => {
    robots('', 404);

    expect((await service.evaluate('https://example.com/a')).outcome).toBe(RobotsOutcome.ALLOWED);
  });

  it('treats a 5xx or unreachable robots.txt as unreachable (RFC 9309)', async () => {
    robots('', 503);
    expect((await service.evaluate('https://a.example/x')).outcome).toBe(RobotsOutcome.UNREACHABLE);

    adapter.fetchRobotsTxt.mockResolvedValue({ status: null, body: null, via: 'plain' });
    expect((await service.evaluate('https://b.example/x')).outcome).toBe(RobotsOutcome.UNREACHABLE);
  });

  it('always allows robots.txt itself without fetching anything', async () => {
    const decision = await service.evaluate('https://example.com/robots.txt');

    expect(decision.outcome).toBe(RobotsOutcome.ALLOWED);
    expect(adapter.fetchRobotsTxt).not.toHaveBeenCalled();
  });

  it('caches one robots.txt per origin', async () => {
    robots('User-agent: *\nDisallow:');

    await service.evaluate('https://example.com/a');
    await service.evaluate('https://example.com/b');

    expect(adapter.fetchRobotsTxt).toHaveBeenCalledTimes(1);
  });

  it('caps a very long Crawl-delay', async () => {
    robots('User-agent: *\nCrawl-delay: 3600');

    expect((await service.evaluate('https://example.com/a')).crawlDelayMs).toBe(10_000);
  });

  it('evicts the oldest origin once the cache is full', async () => {
    robots('User-agent: *\nDisallow:');
    for (let index = 0; index < 501; index += 1) {
      await service.evaluate(`https://h${String(index)}.example/a`);
    }
    await service.evaluate('https://h0.example/a');

    expect(adapter.fetchRobotsTxt).toHaveBeenCalledTimes(502);
  });
});
