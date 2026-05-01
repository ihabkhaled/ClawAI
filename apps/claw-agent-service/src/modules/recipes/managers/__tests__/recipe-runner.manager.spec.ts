import { CapabilityClass } from '../../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../../common/enums/capability-invocation-status.enum';
import { CapabilityOperation } from '../../../../common/enums/capability-operation.enum';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { RecipeRunnerManager } from '../recipe-runner.manager';
import type { CapabilityApprovalManager } from '../../../agent/managers/capability-approval.manager';
import type { Recipe, RecipeRun, RecipeRunStep } from '../../../../generated/prisma';
import type { RecipeRepository } from '../../repositories/recipe.repository';
import type { RecipeRunRepository } from '../../repositories/recipe-run.repository';
import type { StartRunDto } from '../../dto/start-run.dto';

const dsl = {
  schemaVersion: '1' as const,
  metadata: { title: 'Test' },
  steps: [
    {
      id: 's1',
      capabilityClass: CapabilityClass.FILESYSTEM,
      capabilityOperation: CapabilityOperation.READ,
      target: { path: '$params.inputPath' },
    },
    {
      id: 's2',
      capabilityClass: CapabilityClass.FILESYSTEM,
      capabilityOperation: CapabilityOperation.WRITE,
      target: { path: '/tmp/out.txt' },
      payload: { contentBase64: '$steps.s1.output.contentBase64' },
    },
  ],
};

function fakeRecipe(): Recipe {
  return {
    id: 'r1',
    userId: 'u1',
    name: 'r',
    description: null,
    dsl: dsl as never,
    isEnabled: true,
    version: 1,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Recipe;
}

function fakeRun(): RecipeRun {
  return {
    id: 'run1',
    recipeId: 'r1',
    userId: 'u1',
    deviceId: 'd1',
    status: 'RUNNING',
    params: { inputPath: '/home/u/Documents/x.txt' },
    startedAt: new Date(),
    completedAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as RecipeRun;
}

function fakeStep(idx: number, overrides: Partial<RecipeRunStep> = {}): RecipeRunStep {
  return {
    id: `step-${String(idx)}`,
    recipeRunId: 'run1',
    stepId: `s${String(idx)}`,
    stepIndex: idx - 1,
    status: 'PENDING',
    invocationId: null,
    output: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RecipeRunStep;
}

function fakeRecipeRepo(recipe: Recipe | null): jest.Mocked<RecipeRepository> {
  return {
    create: jest.fn(),
    findByIdForUser: jest.fn().mockResolvedValue(recipe),
    findByNameForUser: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    list: jest.fn(),
  } as unknown as jest.Mocked<RecipeRepository>;
}

function fakeRunRepo(): jest.Mocked<RecipeRunRepository> {
  return {
    createRun: jest.fn(),
    createSteps: jest.fn(),
    findRunByIdForUser: jest.fn(),
    findRunByIdInternal: jest.fn(),
    findRunWithSteps: jest.fn(),
    findStepByInvocationId: jest.fn(),
    findStepsForRun: jest.fn(),
    updateRun: jest.fn(),
    updateStep: jest.fn(),
    listRunsForRecipe: jest.fn(),
  } as unknown as jest.Mocked<RecipeRunRepository>;
}

function fakeApproval(): jest.Mocked<CapabilityApprovalManager> {
  return {
    propose: jest.fn(),
  } as unknown as jest.Mocked<CapabilityApprovalManager>;
}

describe('RecipeRunnerManager', () => {
  describe('start', () => {
    it('creates run, seeds steps, and proposes step 1 with substituted params', async () => {
      const recipeRepo = fakeRecipeRepo(fakeRecipe());
      const runRepo = fakeRunRepo();
      const approval = fakeApproval();
      const run = fakeRun();
      const step1 = fakeStep(1);
      const step2 = fakeStep(2);
      runRepo.createRun.mockResolvedValue(run);
      runRepo.createSteps.mockResolvedValue({ count: 2 });
      runRepo.findStepsForRun.mockResolvedValue([step1, step2]);
      runRepo.findRunByIdForUser.mockResolvedValue(run);
      runRepo.findRunByIdInternal.mockResolvedValue({ ...run, steps: [step1, step2] } as never);
      approval.propose.mockResolvedValue({
        id: 'inv1',
        status: 'AUTO_APPROVED' as never,
        riskScore: 5,
        riskLabel: 'LOW' as never,
        expiresAt: new Date(),
      });

      const runner = new RecipeRunnerManager(recipeRepo, runRepo, approval);
      const dto: StartRunDto = { deviceId: 'd1', params: { inputPath: '/home/u/Documents/x.txt' } };

      const result = await runner.start('u1', 'r1', dto);

      expect(result).toBe(run);
      expect(runRepo.createRun).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', deviceId: 'd1', status: 'RUNNING' }),
      );
      expect(runRepo.createSteps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ stepId: 's1', stepIndex: 0 }),
          expect.objectContaining({ stepId: 's2', stepIndex: 1 }),
        ]),
      );
      // Wait one tick for the fire-and-forget proposeNextStep
      await new Promise((r) => setImmediate(r));
      expect(approval.propose).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          deviceId: 'd1',
          capabilityClass: CapabilityClass.FILESYSTEM,
          capabilityOperation: CapabilityOperation.READ,
          // Placeholder substitution applied
          targetDescriptor: { path: '/home/u/Documents/x.txt' },
          recipeRunId: 'run1',
        }),
      );
    });

    it('throws 404 when recipe not found', async () => {
      const runner = new RecipeRunnerManager(fakeRecipeRepo(null), fakeRunRepo(), fakeApproval());
      await expect(runner.start('u1', 'missing', { deviceId: 'd1', params: {} })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('onStepInvocationTerminated', () => {
    it('marks step SUCCEEDED on EXECUTED + advances run', async () => {
      const runRepo = fakeRunRepo();
      const recipeRepo = fakeRecipeRepo(fakeRecipe());
      const approval = fakeApproval();
      const stepRow = fakeStep(1, { invocationId: 'inv1', status: 'RUNNING' });
      runRepo.findStepByInvocationId.mockResolvedValue(stepRow);
      runRepo.updateStep.mockResolvedValue({ ...stepRow, status: 'SUCCEEDED' });
      runRepo.findRunByIdInternal.mockResolvedValue({
        ...fakeRun(),
        steps: [
          { ...stepRow, status: 'SUCCEEDED' },
          fakeStep(2),
        ],
      } as never);
      runRepo.findStepsForRun.mockResolvedValue([
        { ...stepRow, status: 'SUCCEEDED', output: { contentBase64: 'aGVsbG8=' } },
        fakeStep(2),
      ]);
      approval.propose.mockResolvedValue({
        id: 'inv2',
        status: 'AUTO_APPROVED' as never,
        riskScore: 5,
        riskLabel: 'LOW' as never,
        expiresAt: new Date(),
      });

      const runner = new RecipeRunnerManager(recipeRepo, runRepo, approval);
      await runner.onStepInvocationTerminated(
        'inv1',
        CapabilityInvocationStatus.EXECUTED,
        { contentBase64: 'aGVsbG8=' },
        null,
      );

      expect(runRepo.updateStep).toHaveBeenCalledWith(
        stepRow.id,
        expect.objectContaining({ status: 'SUCCEEDED' }),
      );
      // Step 2 should be proposed with $steps.s1.output.contentBase64 resolved
      expect(approval.propose).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          targetDescriptor: { path: '/tmp/out.txt' },
          payload: { contentBase64: 'aGVsbG8=' },
        }),
      );
    });

    it('marks run FAILED on FAILED step (default abort policy)', async () => {
      const runRepo = fakeRunRepo();
      const stepRow = fakeStep(1, { invocationId: 'inv-bad', status: 'RUNNING' });
      runRepo.findStepByInvocationId.mockResolvedValue(stepRow);
      runRepo.updateStep.mockResolvedValue(stepRow);
      runRepo.findRunByIdInternal.mockResolvedValue({
        ...fakeRun(),
        steps: [stepRow, fakeStep(2)],
      } as never);
      runRepo.findStepsForRun.mockResolvedValue([stepRow, fakeStep(2)]);

      const runner = new RecipeRunnerManager(
        fakeRecipeRepo(fakeRecipe()),
        runRepo,
        fakeApproval(),
      );
      await runner.onStepInvocationTerminated(
        'inv-bad',
        CapabilityInvocationStatus.FAILED,
        null,
        'something blew up',
      );

      expect(runRepo.updateRun).toHaveBeenCalledWith(
        'run1',
        expect.objectContaining({ status: 'FAILED', errorMessage: expect.any(String) }),
      );
    });

    it('ignores invocations that are not part of any run', async () => {
      const runRepo = fakeRunRepo();
      runRepo.findStepByInvocationId.mockResolvedValue(null);

      const runner = new RecipeRunnerManager(
        fakeRecipeRepo(fakeRecipe()),
        runRepo,
        fakeApproval(),
      );
      await runner.onStepInvocationTerminated('inv-orphan', CapabilityInvocationStatus.EXECUTED, {}, null);

      expect(runRepo.updateStep).not.toHaveBeenCalled();
      expect(runRepo.updateRun).not.toHaveBeenCalled();
    });
  });
});
