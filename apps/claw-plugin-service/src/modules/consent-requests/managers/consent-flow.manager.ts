import { Injectable } from '@nestjs/common';

import { ConsentDecision } from '../../../common/enums/consent-decision.enum';
import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type InvokeBody } from '../../runtime/dto/invoke.dto';
import { type CallContext, type InvokeTarget } from '../../runtime/types/invoke.types';
import { buildArgsPreview } from '../../runtime/utilities/build-args-preview.utility';
import { CONSENT_REQUEST_TTL_MS } from '../constants/consent-requests.constants';
import { ChatConsentsRepository } from '../repositories/chat-consents.repository';
import { ConsentRequestsRepository } from '../repositories/consent-requests.repository';
import {
  type ConsentRequestView,
  type ConsentReview,
  RedeemOutcome,
} from '../types/consent-request.types';
import { pluginNameOf, targetKeyOf } from '../utilities/consent-target.utility';
import { effectiveState, toConsentView } from '../utilities/to-consent-view.utility';

/**
 * The in-chat consent card from the invoke path's side: it spends an approval for the resumed call
 * (once, bound to user + call id + tool + target + argument hash), reads the "for this chat" and
 * confirmed standing grants, and opens the question when the gate says a yes is needed.
 */
@Injectable()
export class ConsentFlowManager {
  constructor(
    private readonly requests: ConsentRequestsRepository,
    private readonly grants: ChatConsentsRepository,
  ) {}

  async review(
    userId: string,
    body: InvokeBody,
    target: InvokeTarget,
    argsHash: string,
  ): Promise<ConsentReview> {
    const now = new Date();
    let redeemed = false;
    if (body.consentRequestId !== undefined) {
      const outcome = await this.redeem(userId, body, target, argsHash, now);
      if (outcome === RedeemOutcome.DENIED) {
        return { redeemed: false, extraGrant: false, refusal: InvokeErrorCode.CONSENT_DENIED };
      }
      if (outcome === RedeemOutcome.EXPIRED) {
        return { redeemed: false, extraGrant: false, refusal: InvokeErrorCode.CONSENT_EXPIRED };
      }
      redeemed = outcome === RedeemOutcome.REDEEMED;
    }
    const extraGrant = redeemed ? false : await this.hasExtraGrant(userId, body, target, now);
    return { redeemed, extraGrant, refusal: null };
  }

  /** Records the question and returns what the card needs. The same call asking twice gets the same request. */
  async open(
    context: CallContext,
    reason: ConsentDecision,
    args: Record<string, unknown>,
  ): Promise<ConsentRequestView & { callId: string }> {
    const now = new Date();
    const target = context.target;
    const row = await this.requests.open(
      {
        userId: context.userId,
        installId: target.installId,
        serverId: target.serverId,
        pluginSlug: target.slug,
        pluginName: pluginNameOf(target),
        toolName: target.toolName,
        toolTitle: target.title,
        riskLevel: target.riskLevel,
        callId: context.callId,
        conversationId: context.conversationId ?? null,
        messageId: context.messageId ?? null,
        surface: context.surface,
        argsHash: context.argsHash,
        argsPreview: buildArgsPreview(args),
        reason,
        expiresAt: new Date(now.getTime() + CONSENT_REQUEST_TTL_MS),
      },
      now,
    );
    // The row's own call id: a re-asked question gets the card already open, and resuming must use its id.
    return { ...toConsentView(row, now), callId: row.callId };
  }

  private async redeem(
    userId: string,
    body: InvokeBody,
    target: InvokeTarget,
    argsHash: string,
    now: Date,
  ): Promise<RedeemOutcome> {
    const requestId = body.consentRequestId ?? '';
    const spent = await this.requests.consume({
      userId,
      requestId,
      callId: body.callId,
      argsHash,
      toolName: target.toolName,
      installId: target.installId,
      serverId: target.serverId,
      now,
    });
    if (spent) return RedeemOutcome.REDEEMED;
    const row = await this.requests.findOwned(userId, requestId);
    if (row?.callId !== body.callId || row.argsHash !== argsHash) {
      return RedeemOutcome.NOT_USABLE;
    }
    const state = effectiveState(row, now);
    if (state === ConsentRequestState.DENIED) return RedeemOutcome.DENIED;
    return state === ConsentRequestState.EXPIRED ? RedeemOutcome.EXPIRED : RedeemOutcome.NOT_USABLE;
  }

  private async hasExtraGrant(
    userId: string,
    body: InvokeBody,
    target: InvokeTarget,
    now: Date,
  ): Promise<boolean> {
    if (target.riskLevel === RiskLevel.DESTRUCTIVE) {
      return (
        target.installId !== null &&
        this.grants.hasConfirmedDestructive(target.installId, target.toolName)
      );
    }
    if (target.riskLevel !== RiskLevel.WRITE || target.consentGranted) return false;
    if (body.conversationId === undefined) return false;
    return this.grants.exists({
      userId,
      conversationId: body.conversationId,
      targetKey: targetKeyOf(target),
      toolName: target.toolName,
      now,
    });
  }
}
