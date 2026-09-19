import { Injectable, Logger } from '@nestjs/common';
import { AssistantModelRole } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ASSISTANT_MODEL_SEED_LOCK_ID } from '../constants/assistant-model-seed.constants';
import type {
  AssistantModelInput,
  AssistantModelRecord,
  AssistantModelSeedEntry,
} from '../types/assistant-model.types';

@Injectable()
export class AssistantModelRepository {
  private readonly logger = new Logger(AssistantModelRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByRole(role: AssistantModelRole): Promise<AssistantModelRecord[]> {
    return this.prisma.assistantModel.findMany({
      where: { role },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        role: true,
        order: true,
        enabled: true,
        provider: true,
        modelAlias: true,
        deploymentId: true,
        timeoutMs: true,
        maxTokens: true,
      },
    });
  }

  /**
   * Replaces a role's candidates wholesale.
   *
   * Declarative rather than per-row: array position becomes `order`, so one
   * call covers add, remove and reorder without a sequence of writes that could
   * leave the role half-updated between them.
   */
  async replaceRole(
    role: AssistantModelRole,
    entries: readonly AssistantModelInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.assistantModel.deleteMany({ where: { role } });
      if (entries.length === 0) {
        return;
      }
      await tx.assistantModel.createMany({
        data: entries.map((entry, index) => ({
          role,
          order: index + 1,
          enabled: entry.enabled,
          provider: entry.provider,
          modelAlias: entry.modelAlias,
          deploymentId: entry.deploymentId ?? null,
          timeoutMs: entry.timeoutMs,
          maxTokens: entry.maxTokens,
        })),
      });
    });
    this.logger.log(`replaceRole: ${role} now has ${String(entries.length)} candidate(s)`);
  }

  /**
   * Seeds EACH role once, and only while that role has no rows at all.
   *
   * Per role, not per batch: counting every role together meant a role added
   * later (FILE_WRITER) never seeded, because RESEARCH_GATE already had rows.
   * Returns true when any role was seeded.
   *
   * Under an advisory lock because every replica runs this on boot, and two
   * of them seeding the same role would collide on the (role, order) unique.
   * An existing row means an admin has already made this role their own —
   * re-seeding would silently undo their choice.
   */
  async seedOnce(entries: readonly AssistantModelSeedEntry[]): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ASSISTANT_MODEL_SEED_LOCK_ID})`;
      const roles = [...new Set(entries.map((entry) => entry.role))];
      const empty: AssistantModelRole[] = [];
      for (const role of roles) {
        if ((await tx.assistantModel.count({ where: { role } })) === 0) {
          empty.push(role);
        }
      }
      if (empty.length === 0) {
        return false;
      }
      await tx.assistantModel.createMany({
        data: entries
          .filter((entry) => empty.includes(entry.role))
          .map((entry) => ({
            role: entry.role,
            order: entry.order,
            provider: entry.provider,
            modelAlias: entry.modelAlias,
            timeoutMs: entry.timeoutMs,
            maxTokens: entry.maxTokens,
          })),
      });
      return true;
    });
  }
}
