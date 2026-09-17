import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { httpRequest } from '../../../../common/utilities';
import { ResearchGateService } from '../research-gate.service';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  httpRequest: vi.fn(),
}));

const mockedHttpRequest = vi.mocked(httpRequest);

const reply = (needsWeb: boolean): unknown => ({
  ok: true,
  status: 200,
  data: { response: JSON.stringify({ needsWeb, reason: 'because' }) },
});

// The candidates are admin-managed rows served by routing-service, so the first
// call the gate makes is a configuration lookup, not a classifier call.
const CANDIDATES = [
  { provider: 'OLLAMA_CLOUD', modelAlias: 'primary', timeoutMs: 6000, maxTokens: 64 },
  { provider: 'OLLAMA_CLOUD', modelAlias: 'secondary', timeoutMs: 6000, maxTokens: 64 },
];

const candidatesReply = (entries: unknown = CANDIDATES): unknown => ({
  ok: true,
  status: 200,
  data: entries,
});

describe('ResearchGateService', () => {
  let service: ResearchGateService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama.test',
      ROUTING_SERVICE_URL: 'http://routing.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    service = new ResearchGateService();
  });

  it('returns the verdict the first reachable model gives', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce(reply(true) as never);

    await expect(service.needsWeb('latest news')).resolves.toEqual({
      needsWeb: true,
      reason: 'because',
    });
    // one configuration lookup, one classifier call
    expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
  });

  // The model is an operator choice, not a deploy-time constant.
  it('asks the model the admin configured', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce(reply(false) as never);

    await service.needsWeb('hello');

    expect(mockedHttpRequest.mock.calls[1]?.[0]).toMatchObject({
      body: expect.objectContaining({ model: 'primary' }),
    });
  });

  // Emptying the list is how an admin turns the gate off, and "never research"
  // is the same answer failing closed already gives.
  it('answers no when no candidate is configured', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply([]) as never);

    await expect(service.needsWeb('latest news')).resolves.toEqual({
      needsWeb: false,
      reason: 'no classifier configured',
    });
  });

  it('falls through to the next candidate when the first does not answer', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockRejectedValueOnce(new Error('unreachable'));
    mockedHttpRequest.mockResolvedValueOnce(reply(false) as never);

    await expect(service.needsWeb('hello')).resolves.toEqual({
      needsWeb: false,
      reason: 'because',
    });
    expect(mockedHttpRequest).toHaveBeenCalledTimes(3);
  });

  // The gate exists to REDUCE lookups, so a broken gate must not search.
  it('fails closed when no candidate answers', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockRejectedValue(new Error('unreachable'));

    await expect(service.needsWeb('hello')).resolves.toEqual({
      needsWeb: false,
      reason: 'no classifier reachable',
    });
  });

  // One turn asks twice: where research starts, and again in context assembly.
  it('answers the same message twice without asking the model twice', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce(reply(true) as never);

    const first = await service.needsWeb('same question');
    const second = await service.needsWeb('same question');

    expect(second).toEqual(first);
    expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
  });

  it('caches the fail-closed verdict too, so a dead runtime is not re-proved', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockRejectedValue(new Error('unreachable'));

    await service.needsWeb('same question');
    const callsAfterFirst = mockedHttpRequest.mock.calls.length;
    await service.needsWeb('same question');

    expect(mockedHttpRequest).toHaveBeenCalledTimes(callsAfterFirst);
  });

  // Every candidate is a reasoning model: with thinking on, the whole token
  // budget goes into `thinking` and `response` comes back empty, so the gate
  // fails closed on every message regardless of what the message says.
  it('asks the model not to think, so the budget is spent on the answer', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce(reply(false) as never);

    await service.needsWeb('hello');

    expect(mockedHttpRequest.mock.calls[1]?.[0]).toMatchObject({
      body: expect.objectContaining({ think: false }),
    });
  });

  it('fails closed on the empty answer a thinking model returns', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: '' },
    } as never);

    await expect(service.needsWeb('hello')).resolves.toEqual({
      needsWeb: false,
      reason: 'unparseable',
    });
  });

  it('asks again for a different message', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValue(reply(false) as never);

    await service.needsWeb('one');
    await service.needsWeb('two');

    // configuration fetched once and reused; two classifier calls
    expect(mockedHttpRequest).toHaveBeenCalledTimes(3);
  });
});
