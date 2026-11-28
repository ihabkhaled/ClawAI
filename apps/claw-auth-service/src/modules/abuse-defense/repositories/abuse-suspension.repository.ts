import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ADMIN_SUSPENSION_LIMIT } from '../constants/abuse-defense.constants';
import type { AbuseSuspensionRow, ApplySuspensionInput } from '../types/abuse-defense.types';

/** The audit rows of automatic suspensions, and the one transaction that starts one. */
@Injectable()
export class AbuseSuspensionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The ban columns and the audit row in ONE transaction, so an account is never blocked with
   * no record of why, and never recorded as suspended while it can still sign in. `bannedByUserId`
   * stays null: the system acted, and that null is how the ban gate and the admin list tell an
   * automatic suspension from an administrator's ban.
   */
  /**
   * Suspends the account ONLY while it carries no live ban, in one transaction. The condition is
   * part of the write, so a ban an admin set after the caller's check (lifetime, or longer) is never
   * downgraded to this timed one. Returns null when the account was already banned.
   */
  async apply(input: ApplySuspensionInput): Promise<AbuseSuspensionRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: input.userId,
          OR: [{ bannedAt: null }, { bannedUntil: { lte: input.startedAt } }],
        },
        data: {
          bannedAt: input.startedAt,
          bannedUntil: input.endsAt,
          banReason: input.banReason,
          bannedByUserId: null,
        },
      });
      if (updated.count !== 1) {
        return null;
      }
      return tx.abuseSuspension.create({
        data: {
          userId: input.userId,
          level: input.level,
          reasonCode: input.reasonCode,
          evidence: input.evidence,
          startedAt: input.startedAt,
          endsAt: input.endsAt,
        },
      });
    });
  }

  /** Suspensions that still count towards the next rung: started inside the window and not lifted. */
  async countLiveSince(userId: string, since: Date): Promise<number> {
    return this.prisma.abuseSuspension.count({
      where: { userId, startedAt: { gte: since }, liftedAt: null },
    });
  }

  /**
   * An administrator unbanned the account: every suspension still running is marked lifted, with
   * who and when. One that already ended on its own is left as served (it stays on the ladder).
   */
  async liftActive(userId: string, actorUserId: string, now: Date): Promise<number> {
    const result = await this.prisma.abuseSuspension.updateMany({
      where: { userId, liftedAt: null, endsAt: { gt: now } },
      data: { liftedAt: now, liftedByUserId: actorUserId },
    });
    return result.count;
  }

  async listRecent(userId: string, limit = ADMIN_SUSPENSION_LIMIT): Promise<AbuseSuspensionRow[]> {
    return this.prisma.abuseSuspension.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
