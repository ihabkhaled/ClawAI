import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { HistoryRepository } from '../../history/repositories/history.repository';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { EnhanceModelClient } from '../clients/enhance-model.client';
import { ModelRateClient } from '../clients/model-rate.client';
import { UNIQUE_VIOLATION } from '../constants/enhance.constants';
import { type EnhanceBody, idempotencyKeySchema } from '../dto/enhance.dto';
import { EnhanceRepository } from '../repositories/enhance.repository';
import type {
  EnhanceEstimateView,
  EnhanceResultView,
  ModelRef,
  Resolved,
  StoredEnhancement,
} from '../types/enhance.types';
import { estimateMicroUsd } from '../utilities/enhance-estimate.utility';
import { resolveModelRef } from '../utilities/enhance-model.utility';
import { buildEnhancePrompt, sanitizeEnhancedBody } from '../utilities/enhance-prompt.utility';
import { buildEnhanceRequestId } from '../utilities/enhance-request-id.utility';

@Injectable()
export class EnhanceService {
  constructor(
    private readonly repository: EnhanceRepository,
    private readonly history: HistoryRepository,
    private readonly rates: ModelRateClient,
    private readonly model: EnhanceModelClient,
    private readonly policy: LivePolicyService,
  ) {}

  /** `confirm=false` quotes the cost; `confirm=true` runs the call on the user's own wallet. */
  async enhance(
    userId: string,
    eventId: string,
    body: EnhanceBody,
    idempotencyKey: string | undefined,
  ): Promise<EnhanceEstimateView | EnhanceResultView> {
    const key = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!key.success) throw new BadRequestException('Invalid Idempotency-Key');
    const resolved = await this.resolve(userId, eventId, body);
    const requestId = buildEnhanceRequestId(
      userId,
      eventId,
      resolved.event.version,
      body.modelId,
      key.data,
    );
    if (body.confirm) {
      // A replay is answered from storage even if the model was repriced or unpriced since.
      const existing = await this.repository.findByRequestId(requestId);
      if (existing !== null) return this.replay(existing, eventId);
    }
    const prompt = buildEnhancePrompt(resolved.event);
    const estimate = await this.estimate(resolved.ref, prompt.systemPrompt, prompt.userPrompt);
    if (!body.confirm) {
      return {
        confirmed: false,
        eventId,
        eventVersion: resolved.event.version,
        modelId: body.modelId,
        estimatedMicroUsd: estimate,
      };
    }
    return this.run(userId, resolved, body.modelId, requestId, prompt);
  }

  private async resolve(userId: string, eventId: string, body: EnhanceBody): Promise<Resolved> {
    const event = await this.repository.findEvent(eventId);
    const session =
      event === null ? null : await this.history.findSessionCoveringEvent(userId, event);
    if (event === null || session === null) {
      throw new NotFoundException(LiveHistoryErrorCode.EVENT_NOT_FOUND);
    }
    const ref = resolveModelRef(body.modelId, body.provider);
    if (ref === null) throw new BadRequestException('modelId must be provider/model');
    return { event, sessionId: session.id, ref };
  }

  private async estimate(ref: ModelRef, systemPrompt: string, userPrompt: string): Promise<number> {
    const rates = await this.rates.findRates(ref);
    const estimated =
      rates === null ? null : estimateMicroUsd(rates, systemPrompt.length + userPrompt.length);
    if (estimated === null) {
      throw new UnprocessableEntityException(LiveHistoryErrorCode.MODEL_NOT_PRICED);
    }
    return estimated;
  }

  private replay(existing: StoredEnhancement, eventId: string): EnhanceResultView {
    if (existing.eventId !== eventId) throw new ConflictException('Idempotency key reused');
    return this.toResult(existing, true);
  }

  private async run(
    userId: string,
    resolved: Resolved,
    modelId: string,
    requestId: string,
    prompt: { systemPrompt: string; userPrompt: string },
  ): Promise<EnhanceResultView> {
    const { event, sessionId, ref } = resolved;
    const answer = await this.model.generate({
      userId,
      requestId,
      provider: ref.provider,
      model: ref.model,
      ...prompt,
    });
    const body = sanitizeEnhancedBody(answer.content, `${event.title}\n${event.body}`);
    if (body === null) throw new BadGatewayException(LiveHistoryErrorCode.ENHANCE_FAILED);
    const policy = await this.policy.active();
    try {
      const saved = await this.repository.save({
        userId,
        sessionId,
        runId: event.runId,
        eventId: event.id,
        eventVersion: event.version,
        modelId,
        body,
        costMicroUsd: answer.costMicroUsd,
        requestId,
        policyVersion: policy.version,
      });
      return this.toResult(saved, false);
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
      const winner = await this.repository.findByRequestId(requestId);
      if (winner === null) throw error;
      return this.replay(winner, event.id);
    }
  }

  private toResult(row: StoredEnhancement, replayed: boolean): EnhanceResultView {
    return {
      confirmed: true,
      enhancementId: row.id,
      eventId: row.eventId,
      eventVersion: row.eventVersion,
      modelId: row.modelId,
      body: row.body,
      costMicroUsd: Number(row.costMicroUsd),
      replayed,
    };
  }
}
