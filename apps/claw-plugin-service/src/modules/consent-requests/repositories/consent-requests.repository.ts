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
   * One request per (user, call id). The same call asking again with the same arguments gets the
   * same request back. Different arguments, or a request that ran out of time, reset it to a fresh
   * PENDING one: an earlier yes never covers new arguments.
   */
  async open(input: OpenConsentInput, now: Date): Promise<ConsentRequestRow> {
    const existing = await this.findByCall(input.userId, input.callId);
    if (existing === null) return this.create(input, now);
    const lapsed =
      existing.status === ConsentRequestState.EXPIRED ||
      (existing.status === ConsentRequestState.PENDING && existing.expiresAt <= now);
    const changed = existing.argsHash !== input.argsHash;
    if (!changed && !lapsed) return existing;
    await this.prisma.pluginConsentRequest.updateMany({
      where: { id: existing.id, userId: input.userId, argsHash: existing.argsHash },
      data: {
        argsHash: input.argsHash,
        argsPreview: input.argsPreview,
        reason: input.reason,
        status: ConsentRequestState.PENDING,
        choice: null,
        decidedAt: null,
        consumedAt: null,
        createdAt: now,
        expiresAt: input.expiresAt,
      },
    });
    return (await this.findByCall(input.userId, input.callId)) ?? this.create(input, now);
  }

  /**
   * Inserts the request unless (user, call id) already has one. Two parallel first asks end with
   * one row: the loser's insert is skipped and both read the winner.
   */
  private async create(input: OpenConsentInput, now: Date): Promise<ConsentRequestRow> {
    await this.prisma.pluginConsentRequest.createMany({
      data: [{ ...input, createdAt: now }],
      skipDuplicates: true,
    });
    const row = await this.prisma.pluginConsentRequest.findFirstOrThrow({
      where: { userId: input.userId, callId: input.callId },
    });
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
      data: { status: ConsentRequestState.EXPIRED },
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
        data: { status: input.status, choice: input.choice, decidedAt: input.now },
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
