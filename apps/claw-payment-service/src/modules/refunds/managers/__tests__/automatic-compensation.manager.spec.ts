import { AutomaticCompensationManager } from '../automatic-compensation.manager';

describe('AutomaticCompensationManager', () => {
  const jobs = {
    run: jest.fn(
      async (_options: Record<string, unknown>, operation: () => Promise<void>): Promise<void> =>
        operation(),
    ),
  };
  const refunds = { listRetryableAutomaticCompensations: jest.fn() };
  const compensation = { retry: jest.fn() };
  const first = { refund: { id: 'refund-1' } };
  const second = { refund: { id: 'refund-2' } };
  let manager: AutomaticCompensationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    refunds.listRetryableAutomaticCompensations.mockResolvedValue([first, second]);
    compensation.retry
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockImplementationOnce(() => Promise.resolve());
    manager = new AutomaticCompensationManager(
      jobs as never,
      refunds as never,
      compensation as never,
    );
  });

  it('uses a distributed job lock and continues after one refund attempt fails', async () => {
    const now = new Date('2026-07-28T10:00:00.000Z');

    await manager.sweep(now);

    expect(jobs.run).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: 'automatic-payment-compensation',
        lockKey: 'lock:automatic-payment-compensation',
      }),
      expect.any(Function),
    );
    expect(refunds.listRetryableAutomaticCompensations).toHaveBeenCalledWith(now, 25);
    expect(compensation.retry).toHaveBeenCalledTimes(2);
  });
});
