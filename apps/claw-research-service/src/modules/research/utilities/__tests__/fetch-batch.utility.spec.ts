import { HttpStatus } from '@nestjs/common';
import { vi } from 'vitest';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { classifyFetchError, hostLaneKey, runFetchBatch } from '../fetch-batch.utility';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function refusal(code: ResearchErrorCode): BusinessException {
  return new BusinessException('x', code, HttpStatus.FORBIDDEN, { message: `refused ${code}` });
}

describe('runFetchBatch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs different hosts in parallel: more than one in flight, never above the limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const urls = Array.from({ length: 10 }, (_, i) => `https://h${String(i)}.example.com/p`);
    const outcomes = await runFetchBatch(urls, {
      urlOf: (url) => url,
      concurrency: 4,
      deadlineMs: null,
      worker: async (url) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await sleep(15);
        inFlight -= 1;
        return url;
      },
    });
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(outcomes.every((o) => o.status === 'OK')).toBe(true);
  });

  it('serialises the pages of one host while other hosts overlap', async () => {
    const running = new Map<string, number>();
    let sameHostOverlap = false;
    let crossHostOverlap = false;
    const urls = [
      'https://a.example.com/1',
      'https://a.example.com/2',
      'https://www.a.example.com/3'.replace('www.a', 'a'),
      'https://b.example.com/1',
    ];
    await runFetchBatch(urls, {
      urlOf: (url) => url,
      concurrency: 6,
      deadlineMs: null,
      worker: async (url) => {
        const host = new URL(url).hostname;
        running.set(host, (running.get(host) ?? 0) + 1);
        if ((running.get(host) ?? 0) > 1) sameHostOverlap = true;
        if ([...running.values()].filter((n) => n > 0).length > 1) crossHostOverlap = true;
        await sleep(10);
        running.set(host, (running.get(host) ?? 0) - 1);
      },
    });
    expect(sameHostOverlap).toBe(false);
    expect(crossHostOverlap).toBe(true);
  });

  it('treats www. and the bare host as one lane', () => {
    expect(hostLaneKey('https://www.Example.com/x')).toBe(hostLaneKey('http://example.com/y'));
  });

  it('reports outcomes in input order whatever order they finish in', async () => {
    const delays: Record<string, number> = { a: 40, b: 5, c: 20 };
    const finished: string[] = [];
    const outcomes = await runFetchBatch(['a', 'b', 'c'], {
      urlOf: (key) => `https://${key}.example.com/`,
      concurrency: 3,
      deadlineMs: null,
      worker: async (key) => {
        await sleep(delays[key] ?? 0);
        finished.push(key);
        return key;
      },
    });
    expect(finished).toEqual(['b', 'c', 'a']);
    expect(outcomes.map((o) => o.value)).toEqual(['a', 'b', 'c']);
    expect(outcomes.map((o) => o.index)).toEqual([0, 1, 2]);
  });

  it('one failing URL never fails the batch', async () => {
    const outcomes = await runFetchBatch(['ok1', 'bad', 'ok2'], {
      urlOf: (key) => `https://${key}.example.com/`,
      concurrency: 3,
      deadlineMs: null,
      worker: async (key) => {
        if (key === 'bad') throw new Error('boom');
        return key;
      },
    });
    expect(outcomes.map((o) => o.status)).toEqual(['OK', 'FAILED', 'OK']);
    expect(outcomes[1]?.error).toBe('boom');
  });

  it('keeps SSRF and robots refusals visible per URL inside a batch', async () => {
    const outcomes = await runFetchBatch(
      [
        'http://169.254.169.254/',
        'http://10.0.0.5/',
        'https://r.example.com/x',
        'https://ok.example.com/',
      ],
      {
        urlOf: (url) => url,
        concurrency: 4,
        deadlineMs: null,
        worker: async (url) => {
          if (url.includes('169.254') || url.includes('10.0.0.5'))
            throw refusal(ResearchErrorCode.UNSAFE_URL);
          if (url.includes('r.example')) throw refusal(ResearchErrorCode.FETCH_ROBOTS_DISALLOWED);
          return 'page';
        },
      },
    );
    expect(outcomes.map((o) => o.status)).toEqual([
      'BLOCKED_SSRF',
      'BLOCKED_SSRF',
      'BLOCKED_ROBOTS',
      'OK',
    ]);
  });

  it('reports a failed literal private or metadata address as BLOCKED_SSRF', async () => {
    const outcomes = await runFetchBatch(
      ['http://169.254.169.254/x', 'http://192.168.1.9/', 'https://public.example.com/'],
      {
        urlOf: (url) => url,
        concurrency: 3,
        deadlineMs: null,
        worker: async () => {
          throw refusal(ResearchErrorCode.FETCH_FAILED);
        },
      },
    );
    expect(outcomes.map((o) => o.status)).toEqual(['BLOCKED_SSRF', 'BLOCKED_SSRF', 'FAILED']);
  });

  it('classifies error codes', () => {
    expect(classifyFetchError(refusal(ResearchErrorCode.FETCH_URL_BLOCKED))).toBe('BLOCKED_SSRF');
    expect(classifyFetchError(refusal(ResearchErrorCode.FETCH_TIMEOUT))).toBe('TIMEOUT');
    expect(classifyFetchError(refusal(ResearchErrorCode.FETCH_FAILED))).toBe('FAILED');
    expect(classifyFetchError(new Error('x'))).toBe('FAILED');
  });

  it('at the global cap keeps finished pages and reports the rest TIMEOUT', async () => {
    vi.useFakeTimers();
    const urls = ['fast1', 'fast2', 'slow1', 'slow2', 'queued'].map(
      (k) => `https://${k}.example.com/`,
    );
    const pending = runFetchBatch(urls, {
      urlOf: (url) => url,
      concurrency: 4,
      deadlineMs: 1000,
      worker: async (url) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, url.includes('fast') ? 100 : 60_000);
        });
        return url;
      },
    });
    await vi.advanceTimersByTimeAsync(1000);
    const outcomes = await pending;
    expect(outcomes.map((o) => o.status)).toEqual(['OK', 'OK', 'TIMEOUT', 'TIMEOUT', 'TIMEOUT']);
    expect(outcomes[2]?.startedAt).not.toBeNull();
    // A late finisher after the cap is ignored.
    await vi.advanceTimersByTimeAsync(61_000);
    expect(outcomes[2]?.status).toBe('TIMEOUT');
  });

  it('never starts a queued page after the cap', async () => {
    vi.useFakeTimers();
    const started: string[] = [];
    const pending = runFetchBatch(['a', 'b', 'c'], {
      urlOf: (key) => `https://${key}.example.com/`,
      concurrency: 2,
      deadlineMs: 500,
      worker: async (key) => {
        started.push(key);
        await new Promise(() => {});
      },
    });
    await vi.advanceTimersByTimeAsync(500);
    const outcomes = await pending;
    expect(started).toEqual(['a', 'b']);
    expect(outcomes.map((o) => o.status)).toEqual(['TIMEOUT', 'TIMEOUT', 'TIMEOUT']);
    expect(outcomes[2]?.startedAt).toBeNull();
  });

  it('handles an empty list', async () => {
    expect(
      await runFetchBatch([], {
        urlOf: () => '',
        worker: async () => 1,
        concurrency: 3,
        deadlineMs: 100,
      }),
    ).toEqual([]);
  });
});
