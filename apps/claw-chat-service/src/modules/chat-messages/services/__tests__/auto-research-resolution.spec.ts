import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { ResearchMode } from '../../../../common/enums/research-mode.enum';
import { runResearch } from '../../../../common/utilities';
import { ChatMessagesService } from '../chat-messages.service';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  runResearch: vi.fn(),
}));

const mockedRunResearch = vi.mocked(runResearch);

/**
 * AUTO is resolved in runResearchForIntent and nowhere else, because this is
 * where research actually starts: the bundle it produces is attached to the
 * user message, and every later stage reads it from there. A gate placed
 * downstream never ran, and AUTO — which the composer sends on every message —
 * is not NONE, so ordinary chat went to the web.
 */
describe('ChatMessagesService AUTO research resolution', () => {
  let needsWeb: ReturnType<typeof vi.fn>;
  let hasResearchAccess: ReturnType<typeof vi.fn>;
  let service: ChatMessagesService;

  const run = (intent: string, mode: ResearchMode = ResearchMode.AUTO): Promise<unknown> =>
    service.runResearchForIntent('user-1', 'token', 'thread-1', intent, { mode });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      RESEARCH_SERVICE_URL: 'http://research.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    mockedRunResearch.mockResolvedValue({
      id: 'run-1',
      bundle: { toolsUsed: ['web_search'], helperModels: [], evidence: [] },
    } as never);

    needsWeb = vi.fn().mockResolvedValue({ needsWeb: false, reason: 'chit-chat' });
    hasResearchAccess = vi.fn().mockResolvedValue(true);

    const ctor = ChatMessagesService as unknown as new (...args: unknown[]) => ChatMessagesService;
    const args: unknown[] = new Array(21).fill({});
    args[14] = {
      emitResearchStarted: vi.fn(),
      emitResearchCompleted: vi.fn(),
      emitResearchFailed: vi.fn(),
    };
    args[18] = { hasResearchAccess };
    args[20] = { needsWeb };
    service = new ctor(...args);
  });

  it('does not touch the web when the classifier says the turn does not need it', async () => {
    await expect(run('test')).resolves.toBeNull();
    expect(mockedRunResearch).not.toHaveBeenCalled();
  });

  it('searches when the classifier says the turn needs the web', async () => {
    needsWeb.mockResolvedValue({ needsWeb: true, reason: 'asks for current events' });

    await expect(run('what is the latest news on the ceasefire')).resolves.not.toBeNull();
    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
  });

  // A pasted link is an explicit instruction to read that page; asking a model
  // to confirm it only adds latency to a decision the URL already made.
  it('skips the classifier entirely when the message carries a URL', async () => {
    await expect(run('summarise https://example.com/post')).resolves.not.toBeNull();
    expect(needsWeb).not.toHaveBeenCalled();
  });

  // AUTO deliberately does not raise PLAN_FEATURE_DISABLED, so the plan has to
  // be honoured here or AUTO would be a way around the paid unlock.
  it('resolves to no research on a plan that does not unlock it', async () => {
    hasResearchAccess.mockResolvedValue(false);
    needsWeb.mockResolvedValue({ needsWeb: true, reason: 'asks for current events' });

    await expect(run('what is the latest news')).resolves.toBeNull();
    expect(mockedRunResearch).not.toHaveBeenCalled();
    expect(needsWeb).not.toHaveBeenCalled();
  });

  it('leaves an explicitly chosen mode alone', async () => {
    await expect(run('test', ResearchMode.SEARCH)).resolves.not.toBeNull();
    expect(needsWeb).not.toHaveBeenCalled();
    expect(hasResearchAccess).not.toHaveBeenCalled();
  });

  it('still short-circuits on NONE', async () => {
    await expect(run('test', ResearchMode.NONE)).resolves.toBeNull();
    expect(mockedRunResearch).not.toHaveBeenCalled();
  });
});
