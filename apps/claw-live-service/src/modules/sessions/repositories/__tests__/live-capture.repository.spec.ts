import { LiveCapability, LiveSessionState } from '../../../../generated/prisma';
import { LiveCaptureRepository } from '../live-capture.repository';

describe('LiveCaptureRepository', () => {
  const prisma = { liveViewerSession: { findFirst: vi.fn() } };
  const repository = new LiveCaptureRepository(prisma as never);

  it('reads the target scoped to its owner, with stream capability and run capture owner', async () => {
    prisma.liveViewerSession.findFirst.mockResolvedValueOnce({
      id: 's1',
      state: LiveSessionState.ACTIVE,
      runId: 'r1',
      stream: { capability: LiveCapability.BROWSER_CAPTURE },
      run: { captureSessionId: 's1' },
    });
    await expect(repository.findTarget('s1', 'u1')).resolves.toEqual({
      sessionId: 's1',
      state: LiveSessionState.ACTIVE,
      capability: LiveCapability.BROWSER_CAPTURE,
      runId: 'r1',
      captureSessionId: 's1',
    });
    expect(prisma.liveViewerSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', userId: 'u1' } }),
    );
  });

  it('returns null for a foreign session and a null capture owner without a run', async () => {
    prisma.liveViewerSession.findFirst.mockResolvedValueOnce(null);
    await expect(repository.findTarget('s1', 'other')).resolves.toBeNull();
    prisma.liveViewerSession.findFirst.mockResolvedValueOnce({
      id: 's2',
      state: LiveSessionState.ACTIVE,
      runId: null,
      stream: { capability: LiveCapability.LINK_ONLY },
      run: null,
    });
    await expect(repository.findTarget('s2', 'u1')).resolves.toMatchObject({
      captureSessionId: null,
    });
  });
});
