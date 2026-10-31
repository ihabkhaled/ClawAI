import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { REVOCATION_BATCH_SIZE } from '../constants/session-admin.constants';
import type { SessionState } from '../enums/session-state.enum';
import type { SessionTerminationReason } from '../enums/session-termination-reason.enum';
import type {
  ClearLogsResult,
  CountRow,
  IdRow,
  SessionFamilyRow,
  SessionSummary,
} from '../types/session-admin.types';

/**
 * Every query that reads or closes whole logins (refresh families) for the admin session
 * screens (ADR-204). A "login" is a family; its newest row says where it stands, because a
 * refresh adds a row and never edits the login's origin.
 *
 * State, decided from the newest row and the clock: revoked => TERMINATED, else past its
 * expiry => EXPIRED, else ACTIVE. EXPIRED is never stored.
 *
 * Every statement is parameterised (Prisma.sql); nothing is concatenated.
 */
@Injectable()
export class SessionAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The CTE shared by list and summary: one row per family of one user. */
  private familyRows(userId: string, now: Date): Prisma.Sql {
    return Prisma.sql`
      WITH latest AS (
        SELECT DISTINCT ON (s.family_id) s.*
        FROM sessions s
        WHERE s.user_id = ${userId}
        ORDER BY s.family_id, s.created_at DESC, s.id DESC
      ), fam AS (
        SELECT family_id, MIN(created_at) AS login_at, COUNT(*)::int AS rotations
        FROM sessions
        WHERE user_id = ${userId}
        GROUP BY family_id
      ), rows AS (
        SELECT
          l.family_id, l.ip_address, l.country_code, l.user_agent, l.os, l.browser, l.device_kind,
          l.client_kind::text AS client_kind, l.client_name, l.persistent,
          f.login_at, l.created_at AS last_used_at, l.expires_at, f.rotations,
          l.terminated_at, l.termination_reason, l.terminated_by_user_id,
          CASE
            WHEN l.revoked_at IS NOT NULL THEN 'TERMINATED'
            WHEN l.expires_at <= ${now} THEN 'EXPIRED'
            ELSE 'ACTIVE'
          END AS state
        FROM latest l
        JOIN fam f ON f.family_id = l.family_id
      )`;
  }

  async listFamilies(
    userId: string,
    state: SessionState | undefined,
    page: number,
    pageSize: number,
    now: Date,
  ): Promise<SessionFamilyRow[]> {
    const stateFilter = state === undefined ? Prisma.empty : Prisma.sql`WHERE r.state = ${state}`;
    return this.prisma.$queryRaw<SessionFamilyRow[]>(Prisma.sql`
      ${this.familyRows(userId, now)}
      SELECT r.*, u.username AS terminated_by_name, COUNT(*) OVER()::int AS total
      FROM rows r
      LEFT JOIN users u ON u.id = r.terminated_by_user_id
      ${stateFilter}
      ORDER BY r.last_used_at DESC, r.family_id
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
  }

  async summarize(userId: string, now: Date): Promise<SessionSummary> {
    const rows = await this.prisma.$queryRaw<{ state: string; count: number }[]>(Prisma.sql`
      ${this.familyRows(userId, now)}
      SELECT state, COUNT(*)::int AS count FROM rows GROUP BY state`);
    const summary: SessionSummary = { active: 0, expired: 0, terminated: 0, total: 0 };
    for (const row of rows) {
      if (row.state === 'ACTIVE') summary.active = row.count;
      if (row.state === 'EXPIRED') summary.expired = row.count;
      if (row.state === 'TERMINATED') summary.terminated = row.count;
      summary.total += row.count;
    }
    return summary;
  }

  /** The family a session row belongs to (the caller's access token carries a row id). */
  async findFamilyIdBySessionId(sessionId: string): Promise<string | null> {
    const row = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { familyId: true },
    });
    return row?.familyId ?? null;
  }

  async familyExistsForUser(userId: string, familyId: string): Promise<boolean> {
    const count = await this.prisma.session.count({ where: { userId, familyId } });
    return count > 0;
  }

  /** Whether the family's newest row is still a live login (the same rule the list shows). */
  async isFamilyActive(userId: string, familyId: string, now: Date): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ active: boolean }[]>(Prisma.sql`
      SELECT (revoked_at IS NULL AND expires_at > ${now}) AS active
      FROM sessions
      WHERE user_id = ${userId} AND family_id = ${familyId}
      ORDER BY created_at DESC, id DESC
      LIMIT 1`);
    return rows[0]?.active === true;
  }

  /**
   * Closes the open rows of one user, optionally only one family, optionally sparing one.
   * One atomic UPDATE .. RETURNING, so a refresh racing it cannot leave a row open that this
   * call reported closed. Returns the closed row ids (to publish to Redis, ADR-112).
   */
  async terminateOpenRows(input: {
    userId: string;
    familyId?: string;
    exceptFamilyId?: string;
    reason: SessionTerminationReason;
    actorUserId: string;
    at: Date;
  }): Promise<string[]> {
    const familyFilter =
      input.familyId === undefined ? Prisma.empty : Prisma.sql`AND family_id = ${input.familyId}`;
    const exceptFilter =
      input.exceptFamilyId === undefined
        ? Prisma.empty
        : Prisma.sql`AND family_id <> ${input.exceptFamilyId}`;
    const rows = await this.prisma.$queryRaw<IdRow[]>(Prisma.sql`
      UPDATE sessions
      SET revoked_at = ${input.at}, terminated_at = ${input.at},
          termination_reason = ${input.reason}, terminated_by_user_id = ${input.actorUserId},
          updated_at = ${input.at}
      WHERE user_id = ${input.userId} AND revoked_at IS NULL
      ${familyFilter} ${exceptFilter}
      RETURNING id`);
    return rows.map((row) => row.id);
  }

  /** Counts the distinct families among the given rows' owners that this call closed. */
  async countFamilies(userId: string, ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const groups = await this.prisma.session.groupBy({
      by: ['familyId'],
      where: { userId, id: { in: [...ids] } },
    });
    return groups.length;
  }

  /**
   * One bounded batch of the system-wide kill. Only rows that existed when the kill started
   * (`startedAt`) and are still open, so the loop always ends and a login made DURING the
   * incident survives. SKIP LOCKED lets two runs share work without blocking each other.
   */
  async terminateBatchGlobally(input: {
    startedAt: Date;
    accessCutoff: Date;
    exceptFamilyId: string | null;
    actorUserId: string;
    at: Date;
  }): Promise<string[]> {
    const except =
      input.exceptFamilyId === null
        ? Prisma.empty
        : Prisma.sql`AND family_id <> ${input.exceptFamilyId}`;
    const rows = await this.prisma.$queryRaw<IdRow[]>(Prisma.sql`
      WITH picked AS (
        SELECT id FROM sessions
        WHERE revoked_at IS NULL
          AND expires_at > ${input.accessCutoff}
          AND created_at <= ${input.startedAt}
          ${except}
        ORDER BY id
        LIMIT ${REVOCATION_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE sessions s
      SET revoked_at = ${input.at}, terminated_at = ${input.at},
          termination_reason = 'GLOBAL_TERMINATION', terminated_by_user_id = ${input.actorUserId},
          updated_at = ${input.at}
      FROM picked
      WHERE s.id = picked.id
      RETURNING s.id`);
    return rows.map((row) => row.id);
  }

  /**
   * Hard-deletes the INACTIVE logins (newest row revoked, or past its expiry) of one user, or of
   * everyone when `userId` is null; optionally one family. The inactivity test is inside the
   * DELETE itself, so a login that became active between a read and this call is never touched.
   */
  async deleteInactiveFamilies(input: {
    userId: string | null;
    familyId?: string;
    now: Date;
  }): Promise<ClearLogsResult> {
    const userFilter =
      input.userId === null ? Prisma.empty : Prisma.sql`WHERE user_id = ${input.userId}`;
    const outerUser =
      input.userId === null ? Prisma.empty : Prisma.sql`AND user_id = ${input.userId}`;
    const familyFilter =
      input.familyId === undefined ? Prisma.empty : Prisma.sql`AND family_id = ${input.familyId}`;
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      WITH inactive AS (
        SELECT family_id FROM (
          SELECT DISTINCT ON (family_id) family_id, revoked_at, expires_at
          FROM sessions
          ${userFilter}
          ORDER BY family_id, created_at DESC, id DESC
        ) newest
        WHERE newest.revoked_at IS NOT NULL OR newest.expires_at <= ${input.now}
      ), deleted AS (
        DELETE FROM sessions
        WHERE family_id IN (SELECT family_id FROM inactive)
        ${outerUser} ${familyFilter}
        RETURNING family_id
      )
      SELECT COUNT(DISTINCT family_id)::int AS families, COUNT(*)::int AS total_rows FROM deleted`);
    const row = rows[0];
    return { families: row?.families ?? 0, rows: row?.total_rows ?? 0 };
  }

  /** The caller's own password hash, for the re-authentication step. Never leaves this module. */
  async findPasswordHash(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  }

  async writeAudit(input: {
    actorUserId: string;
    action: string;
    targetUserId: string | null;
    familyCount: number;
    rowCount: number;
  }): Promise<void> {
    await this.prisma.sessionAdminAudit.create({ data: input });
  }
}
