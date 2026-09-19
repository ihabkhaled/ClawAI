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
  { provider: 'OLLAMA', modelAlias: 'primary', timeoutMs: 6000, maxTokens: 64 },
  { provider: 'OLLAMA', modelAlias: 'secondary', timeoutMs: 6000, maxTokens: 64 },
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

describe('ResearchGateService.plan', () => {
  let service: ResearchGateService;
  const planReply = (plan: Record<string, unknown>): unknown => ({
    ok: true,
    status: 200,
    data: { response: JSON.stringify(plan) },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama.test',
      ROUTING_SERVICE_URL: 'http://routing.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    service = new ResearchGateService();
  });

  // The old gate ended the walk on the first malformed reply, which made every
  // fallback model after the first decorative.
  it('moves on to the next model when a reply is unusable', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { response: 'hmm, maybe search?' },
    } as never);
    mockedHttpRequest.mockResolvedValueOnce(
      planReply({
        action: 'search',
        urls: [],
        query: 'ceasefire news',
        maxPages: 5,
        narration: 'Checking the news.',
      }) as never,
    );

    const plan = await service.plan('latest ceasefire news');

    expect(plan).toMatchObject({
      action: 'search',
      query: 'ceasefire news',
      decidedBy: 'secondary',
    });
  });

  it('asks for enough output for a whole plan, not the 64-token yes/no budget', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce(
      planReply({ action: 'answer', urls: [], narration: 'x' }) as never,
    );

    await service.plan('hello');

    expect(mockedHttpRequest.mock.calls[1]?.[0]).toMatchObject({
      body: expect.objectContaining({ options: expect.objectContaining({ num_predict: 600 }) }),
    });
  });

  // A planner outage must never cost a pasted link its page.
  it('still crawls a link the user wrote when no model answers', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockRejectedValue(new Error('unreachable'));

    await expect(service.plan('summarise example.com/pricing')).resolves.toMatchObject({
      action: 'crawl',
      urls: ['https://example.com/pricing'],
    });
  });

  it('answers directly when no model answers and there is no link', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockRejectedValue(new Error('unreachable'));

    await expect(service.plan('hello')).resolves.toMatchObject({ action: 'answer' });
  });

  it('decides after a crawl whether a search is still needed', async () => {
    mockedHttpRequest.mockResolvedValueOnce(candidatesReply() as never);
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        response: '{"needsSearch":true,"query":"acme competitors","narration":"Checking rivals."}',
      },
    } as never);

    await expect(
      service.followUpAfterCrawl('compare acme', 'Acme sells widgets.'),
    ).resolves.toEqual({
      needsSearch: true,
      query: 'acme competitors',
      narration: 'Checking rivals.',
      thinking: '',
    });
  });
});

// Production runs no ollama-service. A hosted model must be called on
// ollama.com with the admin's connector key, or every plan fails there and the
// crawl falls back to its 12-page default.
describe('ResearchGateService on Ollama Cloud', () => {
  const CLOUD = [
    { provider: 'OLLAMA_CLOUD', modelAlias: 'gpt-oss:120b', timeoutMs: 6000, maxTokens: 64 },
    { provider: 'OLLAMA_CLOUD', modelAlias: 'gemma4:31b', timeoutMs: 6000, maxTokens: 64 },
  ];
  const connector = (apiKey: string, baseUrl = 'http://localhost:11434'): unknown => ({
    ok: true,
    status: 200,
    data: { provider: 'OLLAMA', apiKey, baseUrl },
  });
  const cloudReply = (needsWeb: boolean): unknown => ({
    ok: true,
    status: 200,
    data: { message: { content: JSON.stringify({ needsWeb, reason: 'cloud' }) } },
  });
  let service: ResearchGateService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama.test',
      ROUTING_SERVICE_URL: 'http://routing.test',
      CONNECTOR_SERVICE_URL: 'http://connector.test',
    } as never);
    service = new ResearchGateService();
  });

  it('calls ollama.com with the connector key, never ollama-service', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: CLOUD } as never);
    mockedHttpRequest.mockResolvedValueOnce(connector('sk-cloud') as never);
    mockedHttpRequest.mockResolvedValueOnce(cloudReply(true) as never);

    await expect(service.needsWeb('latest news')).resolves.toEqual({
      needsWeb: true,
      reason: 'cloud',
    });
    expect(mockedHttpRequest.mock.calls[1]?.[0]).toMatchObject({
      url: 'http://connector.test/api/v1/internal/connectors/config?provider=OLLAMA',
    });
    // A localhost connector URL still means the hosted API.
    expect(mockedHttpRequest.mock.calls[2]?.[0]).toMatchObject({
      url: 'https://ollama.com/api/chat',
      headers: { Authorization: 'Bearer sk-cloud' },
      body: expect.objectContaining({ model: 'gpt-oss:120b', think: false }),
    });
    expect(
      mockedHttpRequest.mock.calls.some(([request]) =>
        (request as { url: string }).url.startsWith('http://ollama.test'),
      ),
    ).toBe(false);
  });

  it('moves to the next model when the first hosted call fails', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: CLOUD } as never);
    mockedHttpRequest.mockResolvedValueOnce(connector('sk-cloud') as never);
    mockedHttpRequest.mockResolvedValueOnce({ ok: false, status: 503, data: {} } as never);
    mockedHttpRequest.mockResolvedValueOnce(connector('sk-cloud') as never);
    mockedHttpRequest.mockResolvedValueOnce(cloudReply(false) as never);

    await expect(service.needsWeb('hello')).resolves.toMatchObject({ needsWeb: false });
    expect(mockedHttpRequest.mock.calls[4]?.[0]).toMatchObject({
      body: expect.objectContaining({ model: 'gemma4:31b' }),
    });
  });

  it('fails closed when no Ollama connector key is saved', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: CLOUD } as never);
    mockedHttpRequest.mockResolvedValue(connector('') as never);

    await expect(service.needsWeb('latest news')).resolves.toMatchObject({ needsWeb: false });
  });
});
