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

const RUN = {
  id: 'run-1',
  bundle: { toolsUsed: ['web_fetch'], helperModels: [], items: [], warnings: [] },
};

/**
 * AUTO research goes through the planner loop (ResearchOrchestratorManager);
 * an explicitly chosen mode runs exactly what the user picked. The plan gate
 * applies to AUTO before anything else, because AUTO deliberately skips the
 * PLAN_FEATURE_DISABLED 403 an explicit mode raises.
 */
describe('ChatMessagesService research modes', () => {
  let hasResearchAccess: ReturnType<typeof vi.fn>;
  let orchestratorRun: ReturnType<typeof vi.fn>;
  let emitResearchCompleted: ReturnType<typeof vi.fn>;
  let service: ChatMessagesService;

  const run = (intent: string, mode: ResearchMode = ResearchMode.AUTO): Promise<unknown> =>
    service.runResearchForIntent('user-1', 'token', 'thread-1', intent, { mode });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      RESEARCH_SERVICE_URL: 'http://research.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    mockedRunResearch.mockResolvedValue(RUN as never);

    hasResearchAccess = vi.fn().mockResolvedValue(true);
    orchestratorRun = vi.fn().mockResolvedValue(RUN);
    emitResearchCompleted = vi.fn();

    const ctor = ChatMessagesService as unknown as new (...args: unknown[]) => ChatMessagesService;
    const args: unknown[] = new Array(22).fill({});
    args[14] = { emitResearchStarted: vi.fn(), emitResearchCompleted, emitResearchFailed: vi.fn() };
    args[18] = { hasResearchAccess };
    args[20] = { run: orchestratorRun };
    args[21] = { reset: vi.fn(), append: vi.fn(), read: vi.fn().mockResolvedValue([]) };
    service = new ctor(...args);
  });

  it('hands AUTO to the planner loop with the turn it is for', async () => {
    await expect(run('summarise example.com/pricing')).resolves.toBe(RUN);
    expect(orchestratorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        threadId: 'thread-1',
        intent: 'summarise example.com/pricing',
      }),
    );
    expect(emitResearchCompleted).toHaveBeenCalled();
  });

  it('returns no evidence when the planner decides to answer directly', async () => {
    orchestratorRun.mockResolvedValue(null);
    await expect(run('hi')).resolves.toBeNull();
    expect(emitResearchCompleted).not.toHaveBeenCalled();
  });

  // Crawling and research are both behind the plan gate. The URL shortcut used
  // to run BEFORE this check, harmless only while research-service 403'd every
  // non-admin; once research worked for ordinary users, a free user pasting a
  // link would have been handed a paid crawl.
  it('keeps a plan without research off the web, even with a link', async () => {
    hasResearchAccess.mockResolvedValue(false);
    await expect(run('summarise example.com/pricing')).resolves.toBeNull();
    expect(orchestratorRun).not.toHaveBeenCalled();
    expect(mockedRunResearch).not.toHaveBeenCalled();
  });

  it('runs exactly the mode the user chose, without the planner', async () => {
    await expect(run('test', ResearchMode.SEARCH)).resolves.not.toBeNull();
    expect(orchestratorRun).not.toHaveBeenCalled();
    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
  });

  it('does nothing when research is off', async () => {
    await expect(run('test', ResearchMode.NONE)).resolves.toBeNull();
    expect(orchestratorRun).not.toHaveBeenCalled();
    expect(mockedRunResearch).not.toHaveBeenCalled();
  });
});
