import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CurrencyPreferenceMode,
  Prisma,
  User,
  UserAppearancePreference,
  UserLanguagePreference,
  UserStatus,
} from '../../../generated/prisma';
import { PresenceFilter, SortOrder } from '../../../common/enums';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { buildTerminationData } from '../../sessions/utilities/termination-data.utility';
import { presenceCutoff } from '../service.utilities/presence.utility';
import {
  type PublicProfileSource,
  type UpdateUserData,
  type UserFilters,
} from '../types/users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  /** Active accounts only, for the public-profile lookup. Unknown, pending and suspended ids are simply absent. */
  async findActiveProfilesByIds(ids: readonly string[]): Promise<PublicProfileSource[]> {
    return this.prisma.user.findMany({
      where: { id: { in: [...ids] }, status: UserStatus.ACTIVE },
      select: { id: true, username: true, firstName: true, lastName: true },
    });
  }

  /**
   * ACTIVE only. An exact (case-sensitive) match always wins; otherwise a case-insensitive match
   * resolves only when it is unambiguous, because usernames are unique per case ("Ann" and "ann"
   * can both exist) and a mention must never land on the wrong person.
   */
  async findActiveProfileByUsername(username: string): Promise<PublicProfileSource | null> {
    const matches = await this.prisma.user.findMany({
      where: { username: { equals: username, mode: 'insensitive' }, status: UserStatus.ACTIVE },
      select: { id: true, username: true, firstName: true, lastName: true },
      take: 2,
    });
    const exact = matches.find((match) => match.username === username);
    if (exact) return exact;
    return matches.length === 1 ? (matches[0] ?? null) : null;
  }

  async findAll(params: {
    skip: number;
    take: number;
    filters?: UserFilters;
    sortBy?: string;
    sortOrder?: SortOrder;
  }): Promise<{ users: User[]; total: number }> {
    const where = this.buildWhereClause(params.filters);
    const orderBy = { [params.sortBy ?? 'createdAt']: params.sortOrder ?? SortOrder.DESC };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  async updateById(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  /**
   * Clears a PENDING account's email wall in one transaction.
   *
   * Three writes that must not be separable: the status, the verification
   * timestamp, and burning the outstanding token. Setting the status alone —
   * which is all `PATCH /users/:id` ever did — leaves `emailVerifiedAt` null and
   * a live token in the user's inbox, so the account reads as unverified
   * everywhere and the emailed link still works.
   *
   * The token is marked consumed rather than deleted so the verify-email page
   * can tell "already used" from "never existed" and say so.
   */
  async activateAndVerify(id: string, now: Date): Promise<User> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.emailVerificationToken.updateMany({
        where: { userId: id, consumedAt: null },
        data: { consumedAt: now },
      });
      return transaction.user.update({
        where: { id },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
      });
    });
  }

  async deleteById(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async revokeSessionsByUserId(
    userId: string,
    reason: SessionTerminationReason,
    revokedAt = new Date(),
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: buildTerminationData(reason, revokedAt),
    });
    return result.count;
  }

  // Renaming an account is not a credential change, so the device doing the
  // rename keeps its session. Every other device still holds a token minted
  // against the old identity and is signed out.
  async revokeOtherSessionsByUserId(
    userId: string,
    keepSessionId: string,
    revokedAt = new Date(),
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: keepSessionId } },
      data: buildTerminationData(SessionTerminationReason.ACCOUNT_CHANGED, revokedAt),
    });
    return result.count;
  }

  /** Revokes every open session of a user and returns the ids, so the caller can publish them (ADR-112). */
  async revokeSessionsReturningIds(
    userId: string,
    reason: SessionTerminationReason,
    revokedAt = new Date(),
  ): Promise<string[]> {
    const open = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    if (open.length === 0) return [];
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: buildTerminationData(reason, revokedAt),
    });
    return open.map((session) => session.id);
  }

  /** Clears every ban column. Used by unban and by the lazy lift of an expired timed ban. */
  async clearBan(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { bannedAt: null, bannedUntil: null, banReason: null, bannedByUserId: null },
    });
  }

  /**
   * Writes lastSeenAt only when it is older than `staleBefore`. A raw statement on
   * purpose: Prisma's update would also bump `updated_at`, which means "profile
   * changed", and presence is not a profile change. Returns the rows touched.
   */
  async touchLastSeen(id: string, now: Date, staleBefore: Date): Promise<number> {
    return this.prisma
      .$executeRaw`UPDATE "users" SET "last_seen_at" = ${now} WHERE "id" = ${id} AND ("last_seen_at" IS NULL OR "last_seen_at" < ${staleBefore})`;
  }

  async countPresence(
    now: Date,
  ): Promise<{ onlineNow: number; active24h: number; bannedNow: number }> {
    const [onlineNow, active24h, bannedNow] = await this.prisma.$transaction([
      this.prisma.user.count({
        where: { lastSeenAt: { gte: presenceCutoff(PresenceFilter.ONLINE, now) } },
      }),
      this.prisma.user.count({
        where: { lastSeenAt: { gte: presenceCutoff(PresenceFilter.ACTIVE_24H, now) } },
      }),
      this.prisma.user.count({ where: this.activeBanWhere(now) }),
    ]);
    return { onlineNow, active24h, bannedNow };
  }

  async countAll(filters?: UserFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.user.count({ where });
  }

  async updatePreferences(
    userId: string,
    data: {
      languagePreference?: UserLanguagePreference;
      appearancePreference?: UserAppearancePreference;
      currencyPreferenceMode?: CurrencyPreferenceMode;
      preferredCountryCode?: string | null;
      preferredCurrencyCode?: string | null;
      ttsVoice?: string | null;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /** Banned right now: lifetime, or a timed ban whose end is still ahead. */
  private activeBanWhere(now: Date): Prisma.UserWhereInput {
    return {
      bannedAt: { not: null },
      OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
    };
  }

  private buildWhereClause(filters?: UserFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.planId) {
      where.activePlanId = filters.planId;
    }

    if (filters?.verification) {
      where.emailVerifiedAt = filters.verification === 'VERIFIED' ? { not: null } : null;
    }

    if (filters?.presence) {
      where.lastSeenAt = { gte: presenceCutoff(filters.presence, new Date()) };
    }

    if (filters?.banned) {
      where.AND = [this.activeBanWhere(new Date())];
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
