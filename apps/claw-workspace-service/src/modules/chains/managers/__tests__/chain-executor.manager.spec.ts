import { BusinessException } from '../../../../common/errors/business.exception';
import { ChainExecutorManager } from '../chain-executor.manager';

// Two-step chain: create a Jira ticket, then post a Slack message
// referencing the ticket's externalId via a placeholder.
const twoStepDsl = {
  steps: [
    { id: 'make-ticket', connectorId: 'c-jira', actionType: 'CREATE_TICKET', payload: {} },
    {
      id: 'announce',
      connectorId: 'c-slack',
      actionType: 'SEND_SLACK',
      payload: { text: 'Filed {{steps.make-ticket.output.externalId}}' },
    },
  ],
};

const makeChainRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
  findById: jest.fn(),
  createRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
  updateRun: jest.fn().mockResolvedValue({}),
  createStep: jest
    .fn()
    .mockImplementation((d: { stepId: string }) => Promise.resolve({ id: `step-${d.stepId}` })),
  updateStep: jest.fn().mockResolvedValue({}),
  findRunWithSteps: jest.fn(),
  ...overrides,
});

const makeDeps = (
  opts: {
    chain?: unknown;
    canAccess?: boolean;
    connector?: unknown;
    token?: string | null;
    adapter?: { executeWriteAction?: jest.Mock };
    runWithSteps?: unknown;
    chainRepoOverrides?: Record<string, jest.Mock>;
  } = {},
): {
  manager: ChainExecutorManager;
  chainRepo: Record<string, jest.Mock>;
} => {
  const chainRepo = makeChainRepo({
    findById: jest.fn().mockResolvedValue(opts.chain ?? null),
    findRunWithSteps: jest.fn().mockResolvedValue(
      opts.runWithSteps ?? {
        id: 'run-1',
        chainId: 'chain-1',
        status: 'COMPLETED',
        error: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        steps: [],
      },
    ),
    ...opts.chainRepoOverrides,
  });
  const connectorRepo = {
    findById: jest
      .fn()
      .mockResolvedValue(opts.connector ?? { id: 'c1', provider: 'JIRA', encryptedTokens: 'enc' }),
  };
  const adapterFactory = {
    getAdapter: jest.fn().mockReturnValue(
      opts.adapter ?? {
        executeWriteAction: jest.fn().mockResolvedValue({ success: true, externalId: 'X' }),
      },
    ),
  };
  const tokenRefresh = {
    getValidAccessToken: jest.fn().mockResolvedValue(opts.token === undefined ? 'tok' : opts.token),
  };
  const accessService = {
    can: jest.fn().mockResolvedValue(opts.canAccess ?? true),
  };
  const manager = new ChainExecutorManager(
    chainRepo as never,
    connectorRepo as never,
    adapterFactory as never,
    tokenRefresh as never,
    accessService as never,
  );
  return { manager, chainRepo };
};

describe('ChainExecutorManager', () => {
  it('404s when the chain does not exist', async () => {
    const { manager } = makeDeps({ chain: null });
    await expect(manager.run('u1', 'missing')).rejects.toBeInstanceOf(BusinessException);
  });

  it('404s when the chain belongs to another user', async () => {
    const { manager } = makeDeps({
      chain: { id: 'chain-1', userId: 'bob', isEnabled: true, dsl: twoStepDsl },
    });
    await expect(manager.run('alice', 'chain-1')).rejects.toBeInstanceOf(BusinessException);
  });

  it('rejects a disabled chain', async () => {
    const { manager } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: false, dsl: twoStepDsl },
    });
    await expect(manager.run('u1', 'chain-1')).rejects.toBeInstanceOf(BusinessException);
  });

  it('runs both steps and threads step output into the next step payload', async () => {
    const executeWriteAction = jest
      .fn()
      .mockResolvedValueOnce({ success: true, externalId: 'PROJ-9' })
      .mockResolvedValueOnce({ success: true, externalId: 'msg-1' });
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
      adapter: { executeWriteAction },
    });
    await manager.run('u1', 'chain-1');

    // Second step's payload should have the resolved placeholder.
    const secondCall = executeWriteAction.mock.calls[1];
    expect(secondCall?.[1]).toBe('SEND_SLACK');
    expect(secondCall?.[2]).toEqual({ text: 'Filed PROJ-9' });

    // Run marked COMPLETED.
    expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
      'run-1',
      expect.objectContaining({ status: 'COMPLETED' }),
    );
  });

  it('fails the run when a step has unresolved placeholders', async () => {
    const badDsl = {
      steps: [
        {
          id: 'only',
          connectorId: 'c1',
          actionType: 'SEND_SLACK',
          payload: { text: '{{steps.does-not-exist.output.id}}' },
        },
      ],
    };
    const executeWriteAction = jest.fn();
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: badDsl },
      adapter: { executeWriteAction },
    });
    await manager.run('u1', 'chain-1');
    expect(executeWriteAction).not.toHaveBeenCalled();
    expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('fails the run when the access service denies a step', async () => {
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
      canAccess: false,
    });
    await manager.run('u1', 'chain-1');
    expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('stops the chain when a step adapter returns success=false', async () => {
    const executeWriteAction = jest
      .fn()
      .mockResolvedValueOnce({ success: false, errorMessage: 'jira 500' });
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
      adapter: { executeWriteAction },
    });
    await manager.run('u1', 'chain-1');
    // Only step 1 attempted — step 2 never ran.
    expect(executeWriteAction).toHaveBeenCalledTimes(1);
    expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('fails the step when the adapter throws', async () => {
    const executeWriteAction = jest.fn().mockRejectedValue(new Error('network down'));
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
      adapter: { executeWriteAction },
    });
    await manager.run('u1', 'chain-1');
    expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('classifies a step failure and persists errorClass on the step row', async () => {
    const executeWriteAction = jest
      .fn()
      .mockResolvedValueOnce({ success: false, errorMessage: 'Jira API error: HTTP 429' });
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
      adapter: { executeWriteAction },
    });
    await manager.run('u1', 'chain-1');
    expect(chainRepo['updateStep']).toHaveBeenCalledWith(
      'step-make-ticket',
      expect.objectContaining({ status: 'FAILED', errorClass: 'RATE_LIMIT' }),
    );
  });

  it('classifies an unresolved-placeholder failure as VALIDATION', async () => {
    const badDsl = {
      steps: [
        {
          id: 'only',
          connectorId: 'c1',
          actionType: 'SEND_SLACK',
          payload: { text: '{{steps.x.output.id}}' },
        },
      ],
    };
    const { manager, chainRepo } = makeDeps({
      chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: badDsl },
    });
    await manager.run('u1', 'chain-1');
    expect(chainRepo['updateStep']).toHaveBeenCalledWith(
      'step-only',
      expect.objectContaining({ errorClass: 'VALIDATION' }),
    );
  });

  describe('resume', () => {
    const failedRunWithFirstStepSucceeded = {
      id: 'run-1',
      chainId: 'chain-1',
      userId: 'u1',
      status: 'FAILED',
      error: 'step announce: adapter error',
      startedAt: new Date(),
      finishedAt: new Date(),
      dslSnapshot: twoStepDsl,
      steps: [
        {
          stepId: 'make-ticket',
          status: 'SUCCEEDED',
          output: { externalId: 'PROJ-9', url: null, metadata: {} },
        },
        { stepId: 'announce', status: 'FAILED', output: null },
      ],
    };

    it('404s when the chain does not exist', async () => {
      const { manager } = makeDeps({ chain: null });
      await expect(manager.resume('u1', 'missing', 'run-1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('404s when the run does not exist', async () => {
      const { manager } = makeDeps({
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
        runWithSteps: null,
      });
      await expect(manager.resume('u1', 'chain-1', 'run-1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('rejects resuming a run that is not FAILED (e.g. still RUNNING or already COMPLETED)', async () => {
      const { manager } = makeDeps({
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
        runWithSteps: { ...failedRunWithFirstStepSucceeded, status: 'COMPLETED' },
      });
      await expect(manager.resume('u1', 'chain-1', 'run-1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('does NOT re-execute an already-SUCCEEDED step — only resumes from the failed step onward', async () => {
      const executeWriteAction = jest
        .fn()
        .mockResolvedValue({ success: true, externalId: 'msg-1' });
      const { manager, chainRepo } = makeDeps({
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
        runWithSteps: failedRunWithFirstStepSucceeded,
        adapter: { executeWriteAction },
      });

      await manager.resume('u1', 'chain-1', 'run-1');

      // Exactly one adapter call — the failed "announce" step. The
      // already-succeeded "make-ticket" step must never be re-executed.
      expect(executeWriteAction).toHaveBeenCalledTimes(1);
      expect(executeWriteAction.mock.calls[0]?.[1]).toBe('SEND_SLACK');
      // The resolved placeholder proves the reused output from the
      // already-succeeded step flowed into the resumed step correctly.
      expect(executeWriteAction.mock.calls[0]?.[2]).toEqual({ text: 'Filed PROJ-9' });
      expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
        'run-1',
        expect.objectContaining({ status: 'COMPLETED' }),
      );
    });

    it('marks wasResumed: true the moment resume() is called, distinguishing a manually-repaired run from one that succeeded on the first try', async () => {
      const executeWriteAction = jest
        .fn()
        .mockResolvedValue({ success: true, externalId: 'msg-1' });
      const { manager, chainRepo } = makeDeps({
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
        runWithSteps: failedRunWithFirstStepSucceeded,
        adapter: { executeWriteAction },
      });

      await manager.resume('u1', 'chain-1', 'run-1');

      expect(chainRepo['updateRun']).toHaveBeenNthCalledWith(
        1,
        'run-1',
        expect.objectContaining({ status: 'RUNNING', wasResumed: true }),
      );
    });

    it('marks the run RUNNING before resuming and FAILED again if the resumed step fails again', async () => {
      const executeWriteAction = jest
        .fn()
        .mockResolvedValue({ success: false, errorMessage: 'still down' });
      const { manager, chainRepo } = makeDeps({
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: twoStepDsl },
        runWithSteps: failedRunWithFirstStepSucceeded,
        adapter: { executeWriteAction },
      });

      await manager.resume('u1', 'chain-1', 'run-1');

      expect(chainRepo['updateRun']).toHaveBeenNthCalledWith(
        1,
        'run-1',
        expect.objectContaining({ status: 'RUNNING' }),
      );
      expect(chainRepo['updateRun']).toHaveBeenLastCalledWith(
        'run-1',
        expect.objectContaining({ status: 'FAILED' }),
      );
    });

    it('uses the run dslSnapshot, not the chain current dsl, so an edited chain does not change what a resume replays', async () => {
      const executeWriteAction = jest
        .fn()
        .mockResolvedValue({ success: true, externalId: 'msg-1' });
      const editedDsl = {
        steps: [{ id: 'different-step', connectorId: 'x', actionType: 'Y', payload: {} }],
      };
      const { manager } = makeDeps({
        // Chain's live dsl has since been edited to something unrelated...
        chain: { id: 'chain-1', userId: 'u1', isEnabled: true, dsl: editedDsl },
        // ...but the run's own snapshot (captured at run() time) is untouched.
        runWithSteps: failedRunWithFirstStepSucceeded,
        adapter: { executeWriteAction },
      });

      await manager.resume('u1', 'chain-1', 'run-1');

      // Resumed using the snapshot's "announce" step, not editedDsl's step.
      expect(executeWriteAction).toHaveBeenCalledTimes(1);
      expect(executeWriteAction.mock.calls[0]?.[1]).toBe('SEND_SLACK');
    });
  });
});
