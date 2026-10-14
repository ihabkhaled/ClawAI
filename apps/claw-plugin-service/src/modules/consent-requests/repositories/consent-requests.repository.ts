import { Injectable } from '@nestjs/common';

import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ConsentRequestRow,
  type ConsumeInput,
  type DecideInput,
  type OpenConsentInput,
} from '../types/consent-request.types';
import { mapRequestRow } from '../utilities/map-consent-rows.utility';
import { pendingKeyOf } from '../utilities/pending-key.utility';

/** Consent requests. Every read and write names the owner: another user's id finds nothing. */
@Injectable()
export class ConsentRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwned(userId: string, id: string): Promise<ConsentRequestRow | null> {
    const row = await this.prisma.pluginConsentRequest.findFirst({ where: { id, userId } });
    return row === null ? null : mapRequestRow(row);
  }

  async findByCall(userId: string, callId: string): Promise<ConsentRequestRow | null> {
    const row = await this.prisma.pluginConsentRequest.findFirst({ where: { userId, callId } });
    return row === null ? null : mapRequestRow(row);
  }

  /**
   * One OPEN question per identical ask. Two layers:
   *  - (user, call id): the same call asking again with the same arguments gets the same request;
   *    different arguments, or a request that ran out of time, reset it to a fresh PENDING one (an
   *    earlier yes never covers new arguments);
   *  - `pendingKey` (user, tool, target, argument hash, conversation): a model that re-emits the same
   *    call under a NEW call id gets the already-open card instead of a duplicate. The caller must
   *    use the returned row's `callId` to resume.
   */
  async open(input: OpenConsentInput, now: Date): Promise<ConsentRequestRow> {
    const key = pendingKeyOf(input);
    const existing = await this.findByCall(input.userId, input.callId);
    if (existing === null) {
      return (await this.openByKey(key, now)) ?? this.create(input, key, now);
    }
    const lapsed =
      existing.status === ConsentRequestState.EXPIRED ||
      (existing.status === ConsentRequestState.PENDING && existing.expiresAt <= now);
    const changed = existing.argsHash !== input.argsHash;
    if (!changed && !lapsed) return existing;
    const sibling = await this.openByKey(key, now);
    if (sibling !== null && sibling.id !== existing.id) return sibling;
    await this.prisma.pluginConsentRequest.updateMany({
      where: { id: existing.id, userId: input.userId, argsHash: existing.argsHash },
      data: {
        argsHash: input.argsHash,
        argsPreview: input.argsPreview,
        reason: input.reason,
        status: ConsentRequestState.PENDING,
        pendingKey: key,
        choice: null,
        decidedAt: null,
        consumedAt: null,
        createdAt: now,
        expiresAt: input.expiresAt,
      },
    });
    return (await this.findByCall(input.userId, input.callId)) ?? this.create(input, key, now);
  }

  /** The live open request holding this key; a lapsed one is closed so the key frees up. */
  private async openByKey(key: string, now: Date): Promise<ConsentRequestRow | null> {
    const row = await this.prisma.pluginConsentRequest.findUnique({ where: { pendingKey: key } });
    if (row === null) return null;
    if (row.expiresAt > now) return mapRequestRow(row);
    await this.prisma.pluginConsentRequest.updateMany({
      where: { id: row.id, status: ConsentRequestState.PENDING },
      data: { status: ConsentRequestState.EXPIRED, pendingKey: null },
    });
    return null;
  }

  /**
   * Inserts the request unless (user, call id) or the open key already has one. Two parallel first
   * asks end with one row: the loser's insert is skipped and both read the winner.
   */
  private async create(
    input: OpenConsentInput,
    key: string,
    now: Date,
  ): Promise<ConsentRequestRow> {
    await this.prisma.pluginConsentRequest.createMany({
      data: [{ ...input, pendingKey: key, createdAt: now }],
      skipDuplicates: true,
    });
    const row =
      (await this.prisma.pluginConsentRequest.findFirst({
        where: { userId: input.userId, callId: input.callId },
      })) ??
      (await this.prisma.pluginConsentRequest.findUniqueOrThrow({ where: { pendingKey: key } }));
    return mapRequestRow(row);
  }

  async listPending(
    userId: string,
    now: Date,
    limit: number,
    conversationId?: string,
  ): Promise<ConsentRequestRow[]> {
    const rows = await this.prisma.pluginConsentRequest.findMany({
      where: {
        userId,
        status: ConsentRequestState.PENDING,
        expiresAt: { gt: now },
        ...(conversationId === undefined ? {} : { conversationId }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(mapRequestRow);
  }

  /** Moves a lapsed PENDING request to EXPIRED. Harmless to repeat. */
  async markExpired(userId: string, id: string, now: Date): Promise<void> {
    await this.prisma.pluginConsentRequest.updateMany({
      where: { id, userId, status: ConsentRequestState.PENDING, expiresAt: { lte: now } },
      data: { status: ConsentRequestState.EXPIRED, pendingKey: null },
    });
  }

  /**
   * PENDING -> APPROVED/DENIED exactly once, together with what the choice stores. The status change
   * is conditional (still PENDING, not lapsed), so two approvals racing produce one winner; the
   * loser gets false and writes nothing.
   */
  decide(input: DecideInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const won = await tx.pluginConsentRequest.updateMany({
        where: {
          id: input.id,
          userId: input.userId,
          status: ConsentRequestState.PENDING,
          expiresAt: { gt: input.now },
        },
        data: {
          status: input.status,
          pendingKey: null,
          choice: input.choice,
          decidedAt: input.now,
        },
      });
      if (won.count !== 1) return false;
      const effect = input.effect;
      if (effect.kind === 'CHAT_GRANT') {
        const identity = {
          userId: input.userId,
          conversationId: effect.conversationId,
          targetKey: effect.targetKey,
          toolName: effect.toolName,
        };
        await tx.pluginChatConsent.upsert({
          where: { userId_conversationId_targetKey_toolName: identity },
          create: {
            ...identity,
            pluginSlug: effect.pluginSlug,
            riskLevel: effect.riskLevel,
            grantedAt: input.now,
            expiresAt: effect.expiresAt,
          },
          update: { grantedAt: input.now, expiresAt: effect.expiresAt },
        });
      } else if (effect.kind === 'INSTALL_CONSENT') {
        await tx.pluginToolConsent.upsert({
          where: { installId_toolName: { installId: effect.installId, toolName: effect.toolName } },
          create: {
            installId: effect.installId,
            toolName: effect.toolName,
            level: effect.riskLevel,
            grantedAt: input.now,
            confirmedDestructive: effect.confirmedDestructive,
          },
          update: {
            level: effect.riskLevel,
            grantedAt: input.now,
            confirmedDestructive: effect.confirmedDestructive,
          },
        });
      } else if (effect.kind === 'SERVER_TOOL') {
        await tx.mcpServerTool.updateMany({
          where: {
            localName: effect.toolName,
            server: { id: effect.serverId, ownerUserId: effect.userId },
          },
          data: { consentGranted: true },
        });
      }
      return true;
    });
  }

  /**
   * Spends an approval. One conditional update: APPROVED, never consumed, not lapsed, and bound to
   * this user, call id, tool, target and argument hash. Exactly one caller can win it.
   */
  async consume(input: ConsumeInput): Promise<boolean> {
    const result = await this.prisma.pluginConsentRequest.updateMany({
      where: {
        id: input.requestId,
        userId: input.userId,
        callId: input.callId,
        argsHash: input.argsHash,
        toolName: input.toolName,
        installId: input.installId,
        serverId: input.serverId,
        status: ConsentRequestState.APPROVED,
        consumedAt: null,
        expiresAt: { gt: input.now },
      },
      data: { status: ConsentRequestState.CONSUMED, consumedAt: input.now },
    });
    return result.count === 1;
  }
}
