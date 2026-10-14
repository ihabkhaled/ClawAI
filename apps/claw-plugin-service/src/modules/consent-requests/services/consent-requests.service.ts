import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ConsentChoiceKind } from '../../../common/enums/consent-choice.enum';
import { ConsentRequestErrorCode } from '../../../common/enums/consent-request-error-code.enum';
import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import {
  CHAT_GRANT_LIST_LIMIT,
  CHAT_GRANT_TTL_MS,
  CONSENT_LIST_LIMIT,
  CONSENT_WAIT_POLL_MS,
} from '../constants/consent-requests.constants';
import { type DecisionBody } from '../dto/consent-request.dto';
import { ChatConsentsRepository } from '../repositories/chat-consents.repository';
import { ConsentRequestsRepository } from '../repositories/consent-requests.repository';
import {
  type ChatGrantView,
  type ConsentRequestRow,
  type ConsentRequestView,
  type DecisionEffect,
} from '../types/consent-request.types';
import {
  effectiveState,
  optionsFor,
  toChatGrantView,
  toConsentView,
} from '../utilities/to-consent-view.utility';

/**
 * The user's side of the in-chat consent card: see the open questions, decide one, wait for a
 * decision (chat-service), and revoke "for this chat" grants. Every lookup is by (id, user), so
 * another user's request id is a 404 and cannot be decided, read or waited on.
 */
@Injectable()
export class ConsentRequestsService {
  private readonly logger = new Logger(ConsentRequestsService.name);

  constructor(
    private readonly requests: ConsentRequestsRepository,
    private readonly grants: ChatConsentsRepository,
  ) {}

  async listPending(userId: string, conversationId?: string): Promise<ConsentRequestView[]> {
    const now = new Date();
    const rows = await this.requests.listPending(userId, now, CONSENT_LIST_LIMIT, conversationId);
    return rows.map((row) => toConsentView(row, now));
  }

  async get(userId: string, id: string): Promise<ConsentRequestView> {
    return toConsentView(await this.require(userId, id), new Date());
  }

  async decide(userId: string, id: string, body: DecisionBody): Promise<ConsentRequestView> {
    const now = new Date();
    const row = await this.require(userId, id);
    const state = effectiveState(row, now);
    if (state === ConsentRequestState.EXPIRED) {
      await this.requests.markExpired(userId, id, now);
      throw this.expired();
    }
    if (state !== ConsentRequestState.PENDING) return this.repeat(row, body, now);
    const effect = this.effectOf(row, body, now);
    const isDeny = body.choice === ConsentChoiceKind.DENY;
    const won = await this.requests.decide({
      id,
      userId,
      now,
      status: isDeny ? ConsentRequestState.DENIED : ConsentRequestState.APPROVED,
      choice: body.choice,
      effect,
    });
    if (!won) return this.lostRace(userId, id, body, now);
    this.logger.log(
      `decide: request=${id} tool=${row.toolName} risk=${row.riskLevel} choice=${body.choice}`,
    );
    return toConsentView(await this.require(userId, id), now);
  }

  /** chat-service waits here. A bounded poll over the database, so any replica can answer. */
  async wait(userId: string, id: string, waitMs: number): Promise<ConsentRequestView> {
    const deadline = Date.now() + waitMs;
    for (;;) {
      const now = new Date();
      const row = await this.require(userId, id);
      if (effectiveState(row, now) !== ConsentRequestState.PENDING || Date.now() >= deadline) {
        return toConsentView(row, now);
      }
      const pause = Math.min(CONSENT_WAIT_POLL_MS, Math.max(deadline - Date.now(), 0));
      await new Promise<void>((resolve) => {
        setTimeout(resolve, pause);
      });
    }
  }

  async listGrants(userId: string): Promise<ChatGrantView[]> {
    const rows = await this.grants.listActive(userId, new Date(), CHAT_GRANT_LIST_LIMIT);
    return rows.map(toChatGrantView);
  }

  /** Idempotent for the owner; another user's id finds nothing and answers 404. */
  async revokeGrant(userId: string, id: string): Promise<void> {
    const removed = await this.grants.revoke(userId, id);
    if (!removed) {
      throw new NotFoundException({
        message: 'Chat grant not found',
        errorCode: ConsentRequestErrorCode.GRANT_NOT_FOUND,
      });
    }
  }

  private effectOf(row: ConsentRequestRow, body: DecisionBody, now: Date): DecisionEffect {
    if (body.choice === ConsentChoiceKind.ALLOW_CHAT) return this.chatEffect(row, now);
    return body.choice === ConsentChoiceKind.ALWAYS_ALLOW
      ? this.alwaysEffect(row, body)
      : { kind: 'NONE' };
  }

  private chatEffect(row: ConsentRequestRow, now: Date): DecisionEffect {
    if (!optionsFor(row).allowChat || row.conversationId === null) throw this.scopeNotAllowed();
    return {
      kind: 'CHAT_GRANT',
      conversationId: row.conversationId,
      targetKey: row.installId ?? row.serverId ?? row.pluginSlug,
      pluginSlug: row.pluginSlug,
      toolName: row.toolName,
      riskLevel: row.riskLevel,
      expiresAt: new Date(now.getTime() + CHAT_GRANT_TTL_MS),
    };
  }

  private alwaysEffect(row: ConsentRequestRow, body: DecisionBody): DecisionEffect {
    const options = optionsFor(row);
    if (!options.always) throw this.scopeNotAllowed();
    if (options.alwaysNeedsConfirmation && !body.confirmDestructive) {
      throw new BadRequestException({
        message: 'Always allowing a tool that can delete things needs a second confirmation',
        errorCode: ConsentRequestErrorCode.CONFIRMATION_REQUIRED,
      });
    }
    if (row.installId === null) {
      return {
        kind: 'SERVER_TOOL',
        serverId: row.serverId ?? '',
        userId: row.userId,
        toolName: row.toolName,
      };
    }
    return {
      kind: 'INSTALL_CONSENT',
      installId: row.installId,
      toolName: row.toolName,
      riskLevel: row.riskLevel,
      confirmedDestructive: row.riskLevel === RiskLevel.DESTRUCTIVE,
    };
  }

  /** The same choice sent again is a clean 200; a different one on a decided request is a 409. */
  private repeat(row: ConsentRequestRow, body: DecisionBody, now: Date): ConsentRequestView {
    if (row.choice === body.choice) return toConsentView(row, now);
    throw new ConflictException({
      message: 'This request was already decided',
      errorCode: ConsentRequestErrorCode.ALREADY_DECIDED,
    });
  }

  private async lostRace(
    userId: string,
    id: string,
    body: DecisionBody,
    now: Date,
  ): Promise<ConsentRequestView> {
    const row = await this.require(userId, id);
    if (effectiveState(row, now) === ConsentRequestState.EXPIRED) throw this.expired();
    return this.repeat(row, body, now);
  }

  private async require(userId: string, id: string): Promise<ConsentRequestRow> {
    const row = await this.requests.findOwned(userId, id);
    if (row === null) {
      throw new NotFoundException({
        message: 'Consent request not found',
        errorCode: ConsentRequestErrorCode.NOT_FOUND,
      });
    }
    return row;
  }

  private expired(): GoneException {
    return new GoneException({
      message: 'This request ran out of time, so the tool was not allowed',
      errorCode: ConsentRequestErrorCode.EXPIRED,
    });
  }

  private scopeNotAllowed(): BadRequestException {
    return new BadRequestException({
      message: 'That choice is not available for this tool',
      errorCode: ConsentRequestErrorCode.SCOPE_NOT_ALLOWED,
    });
  }
}
