import { THREAD_CONTEXT_LIMIT } from '../../../../common/constants';
import { RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES } from '../../constants/runtime-v2-run.constants';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

/**
 * Every continuation must carry the question the run was started for.
 *
 * Each tool call appends two transcript entries, so a task that makes a dozen of
 * them fills the window with nothing but its own tool traffic. The guard that
 * was supposed to keep the request in view asked the wrong collection: it looked
 * for the origin in the forty rows read from the database rather than in the
 * twenty that actually reach the model. From about the tenth tool step the
 * origin was in the forty and not in the twenty, so nothing was pinned and the
 * question was gone.
 */
describe('RuntimeV2LoopManager continuation history', () => {
  const originId = 'message_origin';

  function transcript(count: number): { id: string; content: string }[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `message_${String(index)}`,
      content: `tool record ${String(index)}`,
    }));
  }

  function loopWith(stored: { id: string; content: string }[]): {
    history: () => Promise<{ id: string }[]>;
    findById: jest.Mock;
  } {
    // findRecentByThreadId returns newest first, which the manager reverses.
    const findById = jest.fn().mockResolvedValue(null);
    const messages = {
      findRecentByThreadId: jest
        .fn()
        .mockImplementation((_threadId: string, limit: number) =>
          Promise.resolve([...stored].reverse().slice(0, limit)),
        ),
      findById,
    };
    const loop = new RuntimeV2LoopManager(
      messages as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return {
      findById,
      history: () =>
        (
          loop as unknown as {
            continuationHistory: (bound: unknown) => Promise<{ id: string }[]>;
          }
        ).continuationHistory({ threadId: 'thread_1', messageId: originId }),
    };
  }

  it('keeps the question in view once the tool trail is longer than the window', async () => {
    const origin = { id: originId, content: 'Write ClawAI_Full_context.md' };
    const { history } = loopWith([origin, ...transcript(THREAD_CONTEXT_LIMIT + 4)]);

    const result = await history();

    expect(result).toHaveLength(THREAD_CONTEXT_LIMIT);
    expect(result[0]?.id).toBe(originId);
  });

  it('does not read the origin again when the fetch already carried it', async () => {
    const origin = { id: originId, content: 'Write ClawAI_Full_context.md' };
    const { findById, history } = loopWith([origin, ...transcript(THREAD_CONTEXT_LIMIT + 4)]);

    await history();

    expect(findById).not.toHaveBeenCalled();
  });

  it('leaves a window that already contains the question alone', async () => {
    const origin = { id: originId, content: 'Write ClawAI_Full_context.md' };
    const { findById, history } = loopWith([origin, ...transcript(3)]);

    const result = await history();

    expect(result).toHaveLength(4);
    expect(result[0]?.id).toBe(originId);
    expect(findById).not.toHaveBeenCalled();
  });

  it('reads the origin when the trail has pushed it out of the fetch entirely', async () => {
    const { findById, history } = loopWith(
      transcript(RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES + 5),
    );
    findById.mockResolvedValue({ id: originId, content: 'Write ClawAI_Full_context.md' });

    const result = await history();

    expect(findById).toHaveBeenCalledWith(originId);
    expect(result[0]?.id).toBe(originId);
    expect(result).toHaveLength(THREAD_CONTEXT_LIMIT);
  });
});
