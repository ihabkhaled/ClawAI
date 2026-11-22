import { LiveSessionState } from '../../../../generated/prisma';
import { LiveSseSessionRepository } from '../live-sse-session.repository';

describe('LiveSseSessionRepository', () => {
  it('reads the session only for its owner', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        id: 's1',
        userId: 'u1',
        runId: 'r1',
        language: 'en',
        state: LiveSessionState.ACTIVE,
      })
      .mockResolvedValueOnce(null);
    const repository = new LiveSseSessionRepository({ liveViewerSession: { findFirst } } as never);
    await expect(repository.findOwned('s1', 'u1')).resolves.toEqual({
      sessionId: 's1',
      userId: 'u1',
      runId: 'r1',
      language: 'en',
      state: LiveSessionState.ACTIVE,
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', userId: 'u1' } }),
    );
    await expect(repository.findOwned('s1', 'intruder')).resolves.toBeNull();
  });
});
