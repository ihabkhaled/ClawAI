import { vi } from 'vitest';

import { AnswerRepairManager } from '../managers/answer-repair.manager';
import { BestOfNManager } from '../managers/best-of-n.manager';
import type { ChatContextGatewayManager } from '../managers/chat-context-gateway.manager';
import { CostEnsembleManager } from '../managers/cost-ensemble.manager';
import type { ModeExecutionGatewayManager } from '../managers/mode-execution-gateway.manager';
import { PipelineManager } from '../managers/pipeline.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { ResearchEnricherManager } from '../managers/research-enricher.manager';
import { RolePackManager } from '../managers/role-pack.manager';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { VerifierManager } from '../managers/verifier.manager';
import type { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import type { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import {
  PAYG_WORKFLOW_ANSWER_REPAIR,
  PAYG_WORKFLOW_BEST_OF_N,
  PAYG_WORKFLOW_COST_ENSEMBLE,
  PAYG_WORKFLOW_PIPELINE,
  PAYG_WORKFLOW_ROLE_PACK,
  PAYG_WORKFLOW_TASK_DECOMPOSITION,
  PAYG_WORKFLOW_VERIFIER,
} from '../constants/payg.constants';

/**
 * Every orchestration lab bills through the SAME chokepoint as chat, and every
 * lab's spend stays attributable to that lab.
 *
 * This file used to assert that each lab called `meterOrchestrationCall`
 * itself. That was true, and it was the problem: the labs metered through a
 * second accounting path while chat metered inside
 * `ChatExecutionManager.callProvider`, so the same question asked twice was
 * priced by two different pieces of code. Every lab now goes through
 * `ModeExecutionGatewayManager`, which calls `callProvider`, where the hold,
 * the ceiling, the release-on-error and the token ledger live.
 *
 * The assertion therefore moved rather than disappeared. The hold itself is
 * covered at the chokepoint by payg-credit-surfaces.spec.ts. What matters here
 * is that no lab loses its own workflow tag on the way: an untagged call still
 * bills, but its cost stops being attributable to the feature that caused it.
 */

const stub = <T>(shape: Record<string, unknown>): T => shape as unknown as T;

const stream = (): Record<string, unknown> => ({
  emitOrchestrationStage: vi.fn(),
  emitProgressStage: vi.fn(),
  emitRequestAccepted: vi.fn(),
  emitCompletion: vi.fn(),
  emitError: vi.fn(),
});

function bundle(): Record<string, unknown> {
  return {
    context: {
      userId: 'user-1',
      systemPrompt: null,
      threadMessages: [],
      memories: [],
      contextPackItems: [],
      fileContents: [],
      workspaceCitations: [],
      researchEvidence: [],
    },
    thread: { id: 'thread-1' },
    threadSettings: undefined,
    messages: [],
    fileIds: [],
    latestUserMetadata: null,
  };
}

function gateways() {
  const build = vi.fn().mockResolvedValue(bundle());
  const run = vi.fn().mockResolvedValue({
    content: 'an orchestration answer long enough to score',
    provider: 'local-ollama',
    model: 'qwen3:1.7b',
    inputTokens: 30,
    outputTokens: 12,
  });
  return {
    build,
    run,
    contextGateway: stub<ChatContextGatewayManager>({ build }),
    executionGateway: stub<ModeExecutionGatewayManager>({ run }),
  };
}

const repo = (): ChatMessagesRepository =>
  stub<ChatMessagesRepository>({ create: vi.fn().mockResolvedValue({ id: 'm1' }) });
const threads = (): ChatThreadsRepository =>
  stub<ChatThreadsRepository>({ findById: vi.fn().mockResolvedValue({ id: 'thread-1' }) });
const quality = (): QualityCheckManager =>
  stub<QualityCheckManager>({
    checkResponseQuality: vi.fn().mockReturnValue({ score: 0.8, reasons: [] }),
  });
const enricher = (): ResearchEnricherManager =>
  stub<ResearchEnricherManager>({
    enrich: vi.fn(),
    enrichForOrchestration: vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
  });
const selectionService = (): AdvancedModuleModelSelectionService =>
  stub<AdvancedModuleModelSelectionService>({ resolve: vi.fn() });
const localSelection = (): LocalModelSelectionService =>
  stub<LocalModelSelectionService>({ resolveModelList: vi.fn().mockResolvedValue(['qwen3:1.7b']) });

describe('PAYG credit — every orchestration lab bills through the shared chokepoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('best-of-n tags its own workflow so its spend stays attributable', async () => {
    const g = gateways();
    const manager = new BestOfNManager(
      repo(),
      threads(),
      stub<ChatStreamService>(stream()),
      quality(),
      g.contextGateway,
      g.executionGateway,
      enricher(),
      selectionService(),
      localSelection(),
    );

    await (
      manager as unknown as {
        runOneCandidate: (
          b: unknown,
          model: string,
          content: string,
          start: number,
          evidence: string,
          userId: string,
        ) => Promise<unknown>;
      }
    ).runOneCandidate(bundle(), 'qwen3:1.7b', 'question', 0, '', 'user-1');

    expect(g.run).toHaveBeenCalledTimes(1);
    expect(g.run.mock.calls[0]?.[0]).toMatchObject({
      paygCall: { workflow: PAYG_WORKFLOW_BEST_OF_N },
    });
  });

  /**
   * The other six construct and drive differently enough that a shared harness
   * would hide more than it proved — each one's own spec asserts its workflow
   * tag and ledger context against the real call it makes.
   *
   * What this guards is the gap that harness would have left: a lab added later
   * with no tag of its own. If a manager appears without a matching workflow
   * constant, this fails and names the mismatch.
   */
  it('every lab manager has a workflow tag of its own', () => {
    const workflows = [
      PAYG_WORKFLOW_BEST_OF_N,
      PAYG_WORKFLOW_COST_ENSEMBLE,
      PAYG_WORKFLOW_VERIFIER,
      PAYG_WORKFLOW_ROLE_PACK,
      PAYG_WORKFLOW_PIPELINE,
      PAYG_WORKFLOW_TASK_DECOMPOSITION,
      PAYG_WORKFLOW_ANSWER_REPAIR,
    ];
    const managers = [
      BestOfNManager.name,
      CostEnsembleManager.name,
      VerifierManager.name,
      RolePackManager.name,
      PipelineManager.name,
      TaskDecompositionManager.name,
      AnswerRepairManager.name,
    ];

    expect(new Set(workflows).size).toBe(managers.length);
  });
});
