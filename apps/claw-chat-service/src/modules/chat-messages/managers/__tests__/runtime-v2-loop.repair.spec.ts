import { RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE } from '../../constants/runtime-v2-failure.constants';
import {
  RUNTIME_V2_TRUNCATION_REPAIR_ATTEMPTS,
  RUNTIME_V2_TRUNCATION_SHRINK_DEMANDS,
} from '../../constants/runtime-v2-model-output.constants';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

/**
 * A model that asks for the wrong tool gets one corrected turn, on every turn.
 *
 * The first turn of a run parsed its reply inside a try that fell back to the
 * repair instruction; continuations parsed theirs inline, outside any try. So a
 * request for a tool outside the admitted catalog — an ordinary mistake, and
 * exactly what the repair turn exists to correct — escaped the loop as an
 * unhandled exception. Fourteen tool steps into a run that was going well, the
 * panel showed "Internal server error" and the work was lost.
 */
describe('RuntimeV2LoopManager repair on every turn', () => {
  const definition = {
    schemaVersion: '2.0',
    name: 'workspace.files',
    version: '2.0.0',
    description: 'Bounded workspace discovery.',
    operations: ['list'],
    riskClasses: ['inspect'],
    targetIds: ['target:workspace'],
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  };
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    runId: 'run_1',
    provider: 'OLLAMA',
    model: 'minimax-m2.7',
    epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
    toolDefinitions: [definition],
  };

  function toolJson(toolName: string): string {
    return JSON.stringify({
      kind: 'tool',
      toolName,
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: '' },
      targetId: 'target:workspace',
    });
  }

  function repair(callProvider: jest.Mock): Promise<{ output: { kind: string } }> {
    const loop = new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { callProvider } as never,
    );
    return (
      loop as unknown as {
        callWithRepair: (
          bound: unknown,
          context: unknown,
          routingMode: string,
        ) => Promise<{ output: { kind: string } }>;
      }
    ).callWithRepair(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL');
  }

  it('asks again when the model names a tool it was never given', async () => {
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({ content: toolJson('workspace.shell') })
      .mockResolvedValueOnce({ content: toolJson('workspace.files') });

    const result = await repair(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(2);
    expect(result.output).toMatchObject({ kind: 'tool', toolName: 'workspace.files' });
  });

  it('asks again when the model calls a tool in its own dialect', async () => {
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({
        content: 'I will start by exploring. [TOOL_CALL] {toolName="workspace.files"}',
      })
      .mockResolvedValueOnce({ content: toolJson('workspace.files') });

    const result = await repair(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(2);
    expect(result.output).toMatchObject({ kind: 'tool' });
  });

  it('accepts the live nested-target dialect without spending the repair turn', async () => {
    const nestedTargetRequest = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: '', targetId: 'target:workspace' },
    });
    const callProvider = jest.fn().mockResolvedValue({ content: nestedTargetRequest });

    const result = await repair(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(1);
    expect(result.output).toMatchObject({
      kind: 'tool',
      targetId: 'target:workspace',
      arguments: { rootKey: 'workspace-1', path: '' },
    });
  });

  it('reports something a person can act on when the corrected turn is no better', async () => {
    const callProvider = jest.fn().mockResolvedValue({ content: toolJson('workspace.shell') });

    await expect(repair(callProvider)).rejects.toMatchObject({
      code: RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE,
    });
    expect(callProvider).toHaveBeenCalledTimes(2);
  });

  // A tool object cut off by the output limit was given the same single retry
  // as a malformed one, and told the same thing: that its request was invalid.
  // A model reads that as a syntax fault, resends the same body, and is cut at
  // the same place. glm-5.2 lost two flagship lanes to exactly that.
  function truncatedToolJson(): string {
    return toolJson('workspace.files').slice(0, 60);
  }

  it('gives a truncated request more than the single retry a malformed one gets', async () => {
    const callProvider = jest.fn().mockResolvedValue({ content: truncatedToolJson() });

    await expect(repair(callProvider)).rejects.toMatchObject({
      code: RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE,
    });
    expect(callProvider).toHaveBeenCalledTimes(RUNTIME_V2_TRUNCATION_REPAIR_ATTEMPTS + 1);
  });

  it('recovers when the model finally sends a body that fits', async () => {
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({ content: truncatedToolJson() })
      .mockResolvedValueOnce({ content: truncatedToolJson() })
      .mockResolvedValueOnce({ content: toolJson('workspace.files') });

    const result = await repair(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(3);
    expect(result.output).toMatchObject({ kind: 'tool', toolName: 'workspace.files' });
  });

  it('tells a truncated request it was too long, not invalid, and by how much', async () => {
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({ content: truncatedToolJson() })
      .mockResolvedValueOnce({ content: toolJson('workspace.files') });

    await repair(callProvider);

    const repairPrompt = (callProvider.mock.calls[1]?.[2] as { systemPrompt: string }).systemPrompt;
    expect(repairPrompt).toContain('it was too long');
    expect(repairPrompt).toContain(RUNTIME_V2_TRUNCATION_SHRINK_DEMANDS[0]);
    expect(repairPrompt).not.toContain('Your previous tool request was invalid');
  });

  it('shrinks the demanded size on each further truncation', async () => {
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({ content: truncatedToolJson() })
      .mockResolvedValueOnce({ content: truncatedToolJson() })
      .mockResolvedValueOnce({ content: toolJson('workspace.files') });

    await repair(callProvider);

    const secondRepair = (callProvider.mock.calls[2]?.[2] as { systemPrompt: string }).systemPrompt;
    expect(secondRepair).toContain(RUNTIME_V2_TRUNCATION_SHRINK_DEMANDS[1]);
  });

  it('leaves a plain answer untouched', async () => {
    const callProvider = jest.fn().mockResolvedValue({ content: 'The workspace has 7 files.' });

    const result = await repair(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual({ kind: 'final', content: 'The workspace has 7 files.' });
  });
});
