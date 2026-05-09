import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { compilePolicyPattern } from '../../../common/utilities/policy-regex.utility';
import { AiActionApprovalManager } from '../../ai-actions/managers/ai-action-approval.manager';
import { SuggestionTriggerRuleRepository } from '../repositories/suggestion-trigger-rule.repository';
import type { FactoryProcessResult, WorkspaceEventInput } from '../types/suggestion-factory.types';
import type { SuggestionTriggerRule } from '../../../generated/prisma';

import { SuggestionFactoryRateLimiterManager } from './suggestion-factory-rate-limiter.manager';

@Injectable()
export class SuggestionFactoryManager {
  private readonly logger = new Logger(SuggestionFactoryManager.name);

  constructor(
    private readonly ruleRepo: SuggestionTriggerRuleRepository,
    private readonly approval: AiActionApprovalManager,
    private readonly rabbitmq: RabbitMQService,
    private readonly rateLimiter: SuggestionFactoryRateLimiterManager,
  ) {}

  async process(event: WorkspaceEventInput): Promise<FactoryProcessResult> {
    if (!this.rateLimiter.tryReserve(event.eventType)) {
      this.logger.warn(
        `factory: rate-limited eventType=${event.eventType} — skipping (per-event-type budget hit)`,
      );
      void this.publishProcessed(event.eventType, 0, 0);
      return { matchedRules: 0, enqueuedCount: 0, skippedCount: 0, rateLimited: true };
    }
    const rules = await this.ruleRepo.findActiveByEvent(event.eventType);
    const matched = rules.filter((r) => this.matches(r, event));
    let enqueued = 0;
    for (const rule of matched) {
      // Stream 13.3 v1.1 — per-rule cap, in addition to the global per-eventType cap.
      if (
        rule.perRuleBudgetPerHour !== null &&
        rule.perRuleBudgetPerHour !== undefined &&
        !this.rateLimiter.tryReserveForRule(rule.id, rule.perRuleBudgetPerHour)
      ) {
        this.logger.debug(
          `factory: rule ${rule.name} hit perRuleBudgetPerHour=${String(rule.perRuleBudgetPerHour)} — skipping`,
        );
        continue;
      }
      try {
        await this.approval.enqueueSuggestion({
          userId: event.userId,
          connectorId: event.connectorId,
          provider: event.provider,
          actionKind: rule.actionKindToSuggest,
          draftPayload: { eventBody: event.body, ruleName: rule.name },
          generatedBy: { source: 'suggestion_factory', ruleId: rule.id, ruleName: rule.name },
          sourceObjectId: event.sourceObjectId ?? null,
        });
        enqueued += 1;
      } catch (error) {
        this.logger.warn(
          `factory: rule ${rule.name} enqueue failed — ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
    void this.publishProcessed(event.eventType, matched.length, enqueued);
    return {
      matchedRules: matched.length,
      enqueuedCount: enqueued,
      skippedCount: matched.length - enqueued,
      rateLimited: false,
    };
  }

  private matches(rule: SuggestionTriggerRule, event: WorkspaceEventInput): boolean {
    if (!this.testRegex(rule.providerRegex, event.provider ?? '')) return false;
    const bodyText = JSON.stringify(event.body);
    return this.testRegex(rule.contentRegex, bodyText);
  }

  private testRegex(source: string, candidate: string): boolean {
    try {
      return compilePolicyPattern(source).test(candidate);
    } catch (error) {
      this.logger.warn(
        `factory: bad regex "${source}" — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }

  private async publishProcessed(
    eventType: string,
    matchedRules: number,
    enqueuedCount: number,
  ): Promise<void> {
    try {
      await this.rabbitmq.publish(EventPattern.WORKSPACE_SUGGESTION_FACTORY_PROCESSED, {
        eventType,
        matchedRules,
        enqueuedCount,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `factory: publish processed failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
