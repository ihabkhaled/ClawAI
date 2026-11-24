import { LiveSessionState } from '../../../../generated/prisma';
import { ProcessingRunRepository } from '../processing-run.repository';

describe('ProcessingRunRepository.hasBillableSession (recorded-run gate)', () => {
  const count = vi.fn();
  const repository = new ProcessingRunRepository({ liveViewerSession: { count } } as never);

  beforeEach(() => count.mockReset());

  it('play-along: advances while a viewer is ACTIVE or GRACE', async () => {
    count.mockResolvedValue(1);
    await expect(repository.hasBillableSession('run1')).resolves.toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: { runId: 'run1', state: { in: [LiveSessionState.ACTIVE, LiveSessionState.GRACE] } },
    });
  });

  it('summary: waits until the viewer was billed up to within the headroom', async () => {
    count.mockResolvedValue(0);
    await expect(repository.hasBillableSession('run1', 120)).resolves.toBe(false);
    expect(count).toHaveBeenCalledWith({
      where: {
        runId: 'run1',
        state: { in: [LiveSessionState.ACTIVE, LiveSessionState.GRACE] },
        accruedMediaSeconds: { gte: 120 },
      },
    });
  });
});
