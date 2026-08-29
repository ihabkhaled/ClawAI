import { AnswerRepairManager } from '../managers/answer-repair.manager';
import { BestOfNManager } from '../managers/best-of-n.manager';
import { CostEnsembleManager } from '../managers/cost-ensemble.manager';
import { PipelineManager } from '../managers/pipeline.manager';
import { RolePackManager } from '../managers/role-pack.manager';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { VerifierManager } from '../managers/verifier.manager';
import { RepairType } from '../../../common/enums';
import type { AccessControlService } from '../services/access-control.service';
import type { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { ResearchEnricherManager } from '../managers/research-enricher.manager';
import {
  PAYG_WORKFLOW_ANSWER_REPAIR,
  PAYG_WORKFLOW_BEST_OF_N,
  PAYG_WORKFLOW_COST_ENSEMBLE,
  PAYG_WORKFLOW_PIPELINE,
  PAYG_WORKFLOW_ROLE_PACK,
  PAYG_WORKFLOW_TASK_DECOMPOSITION,
  PAYG_WORKFLOW_VERIFIER,
} from '../constants/payg.constants';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

jest.mock('../../../common/utilities/http-client.utility', () => ({ httpRequest: jest.fn() }));
jest.mock('../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../common/utilities/http-client.utility') as {
  httpRequest: jest.Mock;
};
const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const OLLAMA_OK = {
  ok: true,
  status: 200,
  data: {
    model: 'qwen3:1.7b',
    response: 'a perfectly adequate orchestration answer that is long enough to score',
    done: true,
    promptEvalCount: 30,
    evalCount: 12,
  },
};

const stub = <T>(shape: Record<string, unknown>): T => shape as unknown as T;

const stream = (): Record<string, jest.Mock> => ({
  emitOrchestrationStage: jest.fn(),
  emitProgressStage: jest.fn(),
  emitRequestAccepted: jest.fn(),
  emitCompletion: jest.fn(),
  emitError: jest.fn(),
});

const selection = { actualModel: 'qwen3:1.7b', requestedModel: 'AUTO' };

/**
 * The seven orchestration labs that POST straight to ollama-service.
 *
 * Each is exercised at the exact method that owns its provider call, because
 * that is the thing under test: the public entry runs in the background and
 * would prove only that nothing threw. Consensus and escalation-chain are NOT
 * here - they go through `callProvider`, and their surfaces are asserted in
 * `payg-credit-chokepoint.spec.ts` alongside every other chokepoint mode.
 */
type ModeCase = {
  name: string;
  workflow: string;
  run: (access: ReturnType<typeof createFakePaygAccessControl>) => Promise<unknown>;
};

const CASES: ModeCase[] = [
  {
    name: 'best-of-n',
    workflow: PAYG_WORKFLOW_BEST_OF_N,
    run: async (access) => {
      const manager = new BestOfNManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<QualityCheckManager>({
          checkResponseQuality: jest.fn().mockReturnValue({ score: 0.8, reasons: [] }),
        }),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({ resolveModelList: jest.fn() }),
      );
      return (
        manager as unknown as {
          runOneCandidate: (
            url: string,
            model: string,
            content: string,
            start: number,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).runOneCandidate('http://ollama:4008', 'qwen3:1.7b', 'question', 0, '', 'user-1');
    },
  },
  {
    name: 'cost-ensemble',
    workflow: PAYG_WORKFLOW_COST_ENSEMBLE,
    run: async (access) => {
      const manager = new CostEnsembleManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<QualityCheckManager>({
          checkResponseQuality: jest.fn().mockReturnValue({ score: 0.8, reasons: [] }),
        }),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({ resolveModelList: jest.fn() }),
      );
      return (
        manager as unknown as {
          runOneCall: (
            url: string,
            content: string,
            model: string,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).runOneCall('http://ollama:4008', 'question', 'qwen3:1.7b', '', 'user-1');
    },
  },
  {
    name: 'role-pack',
    workflow: PAYG_WORKFLOW_ROLE_PACK,
    run: async (access) => {
      const manager = new RolePackManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({
          resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        }),
      );
      return (
        manager as unknown as {
          runMember: (
            member: { role: string; instruction: string; model: string },
            content: string,
            url: string,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).runMember(
        { role: 'critic', instruction: 'critique this', model: 'qwen3:1.7b' },
        'question',
        'http://ollama:4008',
        '',
        'user-1',
      );
    },
  },
  {
    name: 'pipeline',
    workflow: PAYG_WORKFLOW_PIPELINE,
    run: async (access) => {
      const manager = new PipelineManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({
          resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        }),
      );
      return (
        manager as unknown as {
          runStage: (
            stage: { name: string; instruction: string; model: string },
            input: string,
            url: string,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).runStage(
        { name: 'analyze', instruction: 'analyze this', model: 'qwen3:1.7b' },
        'question',
        'http://ollama:4008',
        '',
        'user-1',
      );
    },
  },
  {
    name: 'task-decomposition',
    workflow: PAYG_WORKFLOW_TASK_DECOMPOSITION,
    run: async (access) => {
      const manager = new TaskDecompositionManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({
          resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        }),
      );
      return (
        manager as unknown as {
          executeOneSubTask: (
            subTask: { id: string; instruction: string; order: number },
            selectionArg: typeof selection,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).executeOneSubTask(
        { id: 's1', instruction: 'do a thing', order: 1 },
        selection,
        '',
        'user-1',
      );
    },
  },
  {
    name: 'verifier',
    workflow: PAYG_WORKFLOW_VERIFIER,
    run: async (access) => {
      const manager = new VerifierManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({
          resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        }),
      );
      return (
        manager as unknown as {
          generateDraft: (
            content: string,
            selectionArg: typeof selection,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).generateDraft('question', selection, '', 'user-1');
    },
  },
  {
    name: 'answer-repair',
    workflow: PAYG_WORKFLOW_ANSWER_REPAIR,
    run: async (access) => {
      const manager = new AnswerRepairManager(
        stub<ChatMessagesRepository>({ create: jest.fn() }),
        stub<ChatThreadsRepository>({ findById: jest.fn() }),
        stub<ChatStreamService>(stream()),
        stub<ResearchEnricherManager>({ enrich: jest.fn() }),
        access as unknown as AccessControlService,
        stub<AdvancedModuleModelSelectionService>({ resolve: jest.fn() }),
        stub<LocalModelSelectionService>({
          resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        }),
      );
      return (
        manager as unknown as {
          callRepairLlm: (
            original: string,
            types: RepairType[],
            selectionArg: typeof selection,
            evidence: string,
            userId: string,
          ) => Promise<unknown>;
        }
      ).callRepairLlm('an answer', [RepairType.FORMAT], selection, '', 'user-1');
    },
  },
];

describe('PAYG credit — every orchestration lab is metered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama:4008',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      AUTH_SERVICE_URL: 'http://auth:4001',
    });
  });

  it.each(CASES.map((c) => [c.name, c] as const))(
    '%s reserves and finalizes around its provider call',
    async (_name, testCase) => {
      httpRequest.mockResolvedValue(OLLAMA_OK);
      const access = createFakePaygAccessControl();

      await testCase.run(access);

      expect(access.meterOrchestrationCall).toHaveBeenCalledTimes(1);
      expect(access.meterOrchestrationCall.mock.calls[0]?.[0]).toMatchObject({
        userId: 'user-1',
        workflow: testCase.workflow,
        // Normalization happens inside the service; the lab names the runtime
        // it actually posts to.
        provider: 'local-ollama',
      });
      expect(access.reserveCredit).toHaveBeenCalledTimes(1);
      expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
      expect(access.releaseCredit).not.toHaveBeenCalled();
    },
  );

  it.each(CASES.map((c) => [c.name, c] as const))(
    '%s releases the hold when the provider call throws',
    async (_name, testCase) => {
      httpRequest.mockRejectedValue(new Error('ollama unreachable'));
      const access = createFakePaygAccessControl();

      await expect(testCase.run(access)).rejects.toBeDefined();

      expect(access.releaseCredit).toHaveBeenCalledTimes(1);
      expect(access.finalizeCredit).not.toHaveBeenCalled();
    },
  );
});
