import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma';
import {
  ROUTINE_SECRET_CONTENTION_CODES,
  ROUTINE_SECRET_METADATA_SELECT,
} from '../constants/routine-secret.constants';
import type {
  RoutineSecretMetadata,
  RoutineSecretRow,
  RoutineSecretWriteOutcome,
  SealedRoutineSecret,
} from '../types/routine-secret.types';

/**
 * Every query is scoped by routine AND owner. Methods that return rows for the owner
 * select metadata only; `listSealed` is the one that returns ciphertext, and only the
 * claim path and the output scrubber call it.
 */
@Injectable()
export class RoutineSecretRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listMetadata(routineId: string, userId: string): Promise<RoutineSecretMetadata[]> {
    return this.prisma.routineSecret.findMany({
      where: { routineId, userId },
      select: ROUTINE_SECRET_METADATA_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async listSealed(routineId: string, userId: string): Promise<RoutineSecretRow[]> {
    return this.prisma.routineSecret.findMany({
      where: { routineId, userId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates one secret unless the name is taken or the routine is at its limit. The
   * count and the insert share a serializable transaction, so two parallel creates
   * cannot both slip under the limit; a loser of that race is reported as `exists`
   * and the caller retries.
   */
  async createWithinLimit(
    data: SealedRoutineSecret,
    limit: number,
  ): Promise<RoutineSecretWriteOutcome> {
    return this.prisma
      .$transaction(
        async (tx): Promise<RoutineSecretWriteOutcome> => {
          const taken = await tx.routineSecret.findFirst({
            where: { routineId: data.routineId, name: data.name },
            select: { id: true },
          });
          if (taken !== null) return { status: 'exists' };
          const count = await tx.routineSecret.count({
            where: { routineId: data.routineId, userId: data.userId },
          });
          if (count >= limit) return { status: 'limit' };
          const secret = await tx.routineSecret.create({
            data,
            select: ROUTINE_SECRET_METADATA_SELECT,
          });
          return { status: 'ok', secret };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => this.onWriteFailure(error));
  }

  /** Replaces the ciphertext of an existing secret; `missing` when there is none to replace. */
  async replace(data: SealedRoutineSecret): Promise<RoutineSecretWriteOutcome> {
    const updated = await this.prisma.routineSecret.updateMany({
      where: { routineId: data.routineId, userId: data.userId, name: data.name },
      data: { ciphertext: data.ciphertext },
    });
    if (updated.count === 0) return { status: 'missing' };
    const secret = await this.prisma.routineSecret.findFirst({
      where: { routineId: data.routineId, userId: data.userId, name: data.name },
      select: ROUTINE_SECRET_METADATA_SELECT,
    });
    return secret === null ? { status: 'missing' } : { status: 'ok', secret };
  }

  async remove(routineId: string, userId: string, name: string): Promise<boolean> {
    const removed = await this.prisma.routineSecret.deleteMany({
      where: { routineId, userId, name },
    });
    return removed.count > 0;
  }

  /** Contention means another writer won: report it. Anything else is not ours to hide. */
  private onWriteFailure(error: unknown): Promise<RoutineSecretWriteOutcome> {
    return this.isContention(error)
      ? Promise.resolve({ status: 'exists' })
      : Promise.reject(error instanceof Error ? error : new Error('routine secret write failed'));
  }

  private isContention(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      ROUTINE_SECRET_CONTENTION_CODES.includes(error.code)
    );
  }
}
