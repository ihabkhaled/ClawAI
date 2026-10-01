import { vi } from 'vitest';
// Stop must END the run. An abort that surfaces as a provider transport error
// ("httpStream: ... connect failed - This operation was aborted") used to be
// treated as that candidate failing, so the chain fell through to the next
// provider and kept streaming after the user pressed Stop.

import { ChatExecutionManager } from '../managers/chat-execution.manager';

type RunExecutorFn = (base: Record<string, unknown>, usedFallback: boolean) => Promise<unknown>;

const buildManager = (
  run: ReturnType<typeof vi.fn>,
  controller: AbortController,
  release: ReturnType<typeof vi.fn>,
): RunExecutorFn => {
  const manager = new ChatExecutionManager(
    {} as never,
    {} as never,
    { setExecutionManager: vi.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { run } as never,
    { register: vi.fn().mockReturnValue(controller), release } as never,
  );
  const target = manager as unknown as { runExecutor: RunExecutorFn };
  return target.runExecutor.bind(manager);
};

describe('ChatExecutionManager runExecutor abort', () => {
  it('returns a cancelled response (no fallback, no tokens) for an aborted transport error', async () => {
    const controller = new AbortController();
    const release = vi.fn();
    const run = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw new Error('httpStream: POST connect failed - This operation was aborted');
    });
    const runExecutor = buildManager(run, controller, release);

    const result = await runExecutor(
      { threadId: 't1', messageId: 'm1', provider: 'GEMINI', model: 'g', startMs: Date.now() },
      true,
    );
    expect(result).toMatchObject({
      finishReason: 'cancelled',
      content: '',
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith('t1');
  });

  it('keeps a genuine provider failure as a failure when not aborted', async () => {
    const controller = new AbortController();
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    const runExecutor = buildManager(run, controller, vi.fn());

    await expect(
      runExecutor({ threadId: 't1', messageId: 'm1', provider: 'GEMINI', model: 'g' }, false),
    ).rejects.toThrow('boom');
  });
});
