import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  RecipeRun,
  RecipeRunStatus,
  RecipeRunStep,
  RecipeRunStepStatus,
} from '../../../generated/prisma';

/**
 * Pure data access for `RecipeRun` + `RecipeRunStep`. No business
 * logic, no throw — services / managers decide.
 */
@Injectable()
export class RecipeRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(data: Prisma.RecipeRunCreateInput): Promise<RecipeRun> {
    return this.prisma.recipeRun.create({ data });
  }

  async createSteps(
    rows: Prisma.RecipeRunStepCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.prisma.recipeRunStep.createMany({ data: rows });
  }

  async findRunByIdForUser(id: string, userId: string): Promise<RecipeRun | null> {
    return this.prisma.recipeRun.findFirst({ where: { id, userId } });
  }

  /** Internal: no userId scope — use only inside the runner manager. */
  async findRunByIdInternal(id: string): Promise<(RecipeRun & { steps: RecipeRunStep[] }) | null> {
    return this.prisma.recipeRun.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
  }

  async findRunWithSteps(
    id: string,
    userId: string,
  ): Promise<(RecipeRun & { steps: RecipeRunStep[] }) | null> {
    return this.prisma.recipeRun.findFirst({
      where: { id, userId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
  }

  async findStepByInvocationId(invocationId: string): Promise<RecipeRunStep | null> {
    return this.prisma.recipeRunStep.findFirst({ where: { invocationId } });
  }

  async findStepsForRun(recipeRunId: string): Promise<RecipeRunStep[]> {
    return this.prisma.recipeRunStep.findMany({
      where: { recipeRunId },
      orderBy: { stepIndex: 'asc' },
    });
  }

  async updateRun(
    id: string,
    data: Prisma.RecipeRunUpdateInput,
  ): Promise<RecipeRun> {
    return this.prisma.recipeRun.update({ where: { id }, data });
  }

  async updateStep(
    id: string,
    data: Prisma.RecipeRunStepUpdateInput,
  ): Promise<RecipeRunStep> {
    return this.prisma.recipeRunStep.update({ where: { id }, data });
  }

  async updateStepMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<RecipeRunStep> {
    return this.prisma.recipeRunStep.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  async listRunsForRecipe(
    recipeId: string,
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RecipeRun[]; total: number }> {
    const where = { recipeId, userId };
    const [data, total] = await Promise.all([
      this.prisma.recipeRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.recipeRun.count({ where }),
    ]);
    return { data, total };
  }

  // Helpers exported as static enum types so callers don't import Prisma directly
  static readonly RUN_TERMINAL: ReadonlySet<RecipeRunStatus> = new Set<RecipeRunStatus>([
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'TIMED_OUT',
  ]);

  static readonly STEP_TERMINAL: ReadonlySet<RecipeRunStepStatus> = new Set<RecipeRunStepStatus>([
    'SUCCEEDED',
    'FAILED',
    'SKIPPED',
  ]);
}
