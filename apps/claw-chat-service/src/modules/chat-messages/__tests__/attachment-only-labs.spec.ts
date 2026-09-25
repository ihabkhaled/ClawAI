import { vi } from 'vitest';

// Attachment-only sends in the lab modes (rule 42 §18).
//
// The builders rewrite the FINAL user turn of an attachment-only send, but a
// lab appends its own prompt after it — a rubric, a classifier, a merge — and
// several quoted the user's text inside that prompt ("Task: ", "Question: ",
// "Original task: ---\n\n---"). With no text those stages were asked about
// nothing. Each lab now quotes the spelled-out request instead, and stores the
// attachments on the user row so the bubble can show them.
import { ATTACHMENT_ONLY_TURN_MARKER } from '../constants/attachment-only-turn.constants';
import { bestOfNMessageSchema } from '../dto/best-of-n-message.dto';
import { costEnsembleMessageSchema } from '../dto/cost-ensemble-message.dto';
import { decomposeTaskSchema } from '../dto/decompose-task.dto';
import { pipelineMessageSchema } from '../dto/pipeline-message.dto';
import { repairMessageSchema } from '../dto/repair-message.dto';
import { rolePackMessageSchema } from '../dto/role-pack-message.dto';
import { verifyMessageSchema } from '../dto/verify-message.dto';
import { AnswerRepairManager } from '../managers/answer-repair.manager';
import { BestOfNManager } from '../managers/best-of-n.manager';
import { CostEnsembleManager } from '../managers/cost-ensemble.manager';
import { PipelineManager } from '../managers/pipeline.manager';
import { RolePackManager } from '../managers/role-pack.manager';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { VerifierManager } from '../managers/verifier.manager';
import { RepairType } from '../../../common/enums/repair-type.enum';

const VIDEO = {
  id: 'f-1',
  filename: 'clip.mp4',
  mimeType: 'video/mp4',
  content: null,
  extractedText: 'TRANSCRIPT [00:01] hello',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const ATTACHMENT_ONLY = { content: '', threadId: 't1', fileIds: ['f-1'] };

type Harness = {
  deps: {
    messagesRepo: { create: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
    threadsRepo: { create: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
    stream: Record<string, ReturnType<typeof vi.fn>>;
    quality: { checkResponseQuality: ReturnType<typeof vi.fn> };
    gateway: { build: ReturnType<typeof vi.fn> };
    modeGateway: { run: ReturnType<typeof vi.fn> };
    enricher: { enrichForOrchestration: ReturnType<typeof vi.fn> };
  };
  prompts: () => string[];
  errors: () => unknown[][];
  finished: () => Promise<void>;
};

function harness(): Harness {
  const streamCalls: Array<[string, unknown[]]> = [];
  const stream = new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get: (target, name: string) => {
      target[name] ??= vi.fn((...args: unknown[]) => {
        streamCalls.push([name, args]);
      });
      return target[name];
    },
  });
  const modeGateway = {
    run: vi.fn(async (request: { prompt?: string }) => {
      const prompt = request.prompt ?? '';
      return {
        content: prompt.includes('quality verifier')
          ? '{"score":0.95,"issues":[],"suggestions":[]}'
          : 'A thorough answer about the attached clip, describing what it shows.',
        provider: 'local-ollama',
        model: 'm',
      };
    }),
  };
  const deps = {
    messagesRepo: {
      create: vi.fn(async (row: Record<string, unknown>) => ({ id: 'row-1', ...row })),
      findById: vi.fn(async () => null),
    },
    threadsRepo: {
      create: vi.fn(async () => ({ id: 't1' })),
      findById: vi.fn(async () => ({ id: 't1', userId: 'u1' })),
    },
    stream,
    quality: {
      checkResponseQuality: vi.fn(() => ({ score: 1, passed: true, reasons: [] })),
    },
    gateway: {
      build: vi.fn(async () => ({
        context: {
          userId: 'u1',
          systemPrompt: null,
          threadMessages: [],
          memories: [],
          contextPackItems: [],
          fileContents: [VIDEO],
          requestedAttachmentCount: 1,
          workspaceCitations: [],
          researchEvidence: [],
        },
        thread: { id: 't1' },
        threadSettings: undefined,
        messages: [],
        fileIds: ['f-1'],
        latestUserMetadata: null,
      })),
    },
    modeGateway,
    enricher: {
      enrichForOrchestration: vi.fn(async () => ({ transcript: null, systemPrompt: '' })),
    },
  };
  return {
    deps,
    prompts: () =>
      modeGateway.run.mock.calls.map(([request]) => (request as { prompt?: string }).prompt ?? ''),
    errors: () => streamCalls.filter(([name]) => name === 'emitError').map(([, args]) => args),
    finished: () =>
      vi.waitFor(() => {
        expect(
          streamCalls.some(([name]) => name === 'emitCompletion' || name === 'emitError'),
        ).toBe(true);
      }),
  };
}

function expectAttachmentOnlyRun(h: Harness): void {
  const userRow = h.deps.messagesRepo.create.mock.calls[0]?.[0] as {
    role: string;
    content: string;
    metadata: Record<string, unknown>;
  };
  expect(userRow.role).toBe('USER');
  expect(userRow.content).toBe('');
  expect(userRow.metadata['fileIds']).toEqual(['f-1']);
  expect(h.errors()).toEqual([]);
  const prompts = h.prompts();
  expect(prompts.length).toBeGreaterThan(0);
  // The first model call of every lab carries the spelled-out request.
  expect(prompts[0]).toContain(ATTACHMENT_ONLY_TURN_MARKER);
  expect(prompts[0]).toContain('For a video');
}

describe('attachment-only sends in the lab modes', () => {
  it('Best-of-N answers the attachment with every candidate', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new BestOfNManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.quality as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeBestOfN('u1', bestOfNMessageSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
    expect(h.prompts().every((prompt) => prompt.includes(ATTACHMENT_ONLY_TURN_MARKER))).toBe(true);
  });

  it('Cost-Ensemble classifies the attachment, not an empty "Task:"', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new CostEnsembleManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.quality as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeCostEnsemble('u1', costEnsembleMessageSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
    expect(h.prompts()[0]).toContain(`Task: ${ATTACHMENT_ONLY_TURN_MARKER}`);
  });

  it('Decompose plans and merges around the attachment', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new TaskDecompositionManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeDecomposition('u1', decomposeTaskSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
    const merge = h.prompts().find((prompt) => prompt.startsWith('Original task:'));
    expect(merge).toContain(ATTACHMENT_ONLY_TURN_MARKER);
  });

  it('Pipeline feeds the attachment request to its first stage', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new PipelineManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executePipeline('u1', pipelineMessageSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
  });

  it('Role Pack gives every role the attachment request', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new RolePackManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeRolePack('u1', rolePackMessageSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
    expect(h.prompts().every((prompt) => prompt.includes(ATTACHMENT_ONLY_TURN_MARKER))).toBe(true);
  });

  it('Verify drafts and judges against the attachment, not an empty "Question:"', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new VerifierManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeVerify('u1', verifyMessageSchema.parse(ATTACHMENT_ONLY), '');
    await h.finished();

    expectAttachmentOnlyRun(h);
    const check = h.prompts().find((prompt) => prompt.includes('quality verifier'));
    expect(check).toContain(`Question: ${ATTACHMENT_ONLY_TURN_MARKER}`);
  });

  it('Repair accepts files alone instead of failing to resolve content', async () => {
    const h = harness();
    const d = h.deps;
    const manager = new AnswerRepairManager(
      d.messagesRepo as never,
      d.threadsRepo as never,
      d.stream as never,
      d.gateway as never,
      d.modeGateway as never,
      d.enricher as never,
    );

    await manager.executeRepair(
      'u1',
      repairMessageSchema.parse({ ...ATTACHMENT_ONLY, repairTypes: [RepairType.FORMAT] }),
      '',
    );
    await h.finished();

    expectAttachmentOnlyRun(h);
  });
});
