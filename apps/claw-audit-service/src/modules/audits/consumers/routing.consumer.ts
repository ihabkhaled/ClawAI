import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AuditsService } from '../services/audits.service';

/// Audits Smart Router Flagship lifecycle events: model registry CRUD,
/// policy changes, learned-score updates, circuit-breaker transitions, and
/// no-execution-model failures.
@Injectable()
export class RoutingAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(RoutingAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[EventPattern, string, 'LOW' | 'MEDIUM' | 'HIGH']> = [
      [EventPattern.ROUTING_PROFILE_CREATED, 'ROUTING_PROFILE_CREATED', 'LOW'],
      [EventPattern.ROUTING_PROFILE_UPDATED, 'ROUTING_PROFILE_UPDATED', 'LOW'],
      [
        EventPattern.ROUTING_PROFILE_LIFECYCLE_CHANGED,
        'ROUTING_PROFILE_LIFECYCLE_CHANGED',
        'MEDIUM',
      ],
      [EventPattern.ROUTING_POLICY_CHANGED, 'ROUTING_POLICY_CHANGED', 'MEDIUM'],
      [EventPattern.ROUTING_LEARNED_SCORE_UPDATED, 'ROUTING_LEARNED_SCORE_UPDATED', 'LOW'],
      [EventPattern.ROUTING_NO_EXECUTION_MODEL, 'ROUTING_NO_EXECUTION_MODEL', 'HIGH'],
      [EventPattern.ROUTING_CIRCUIT_BREAKER_OPENED, 'ROUTING_CIRCUIT_BREAKER_OPENED', 'HIGH'],
      [EventPattern.ROUTING_CIRCUIT_BREAKER_CLOSED, 'ROUTING_CIRCUIT_BREAKER_CLOSED', 'MEDIUM'],
      [
        EventPattern.ROUTING_CIRCUIT_BREAKER_HALF_OPEN,
        'ROUTING_CIRCUIT_BREAKER_HALF_OPEN',
        'MEDIUM',
      ],
    ];
    for (const [pattern, action, severity] of entries) {
      await this.rabbitmq.subscribe(pattern, async (raw: unknown) => {
        await this.write(action, severity, raw);
      });
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  private async write(
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    rawPayload: unknown,
  ): Promise<void> {
    const payload =
      typeof rawPayload === 'object' && rawPayload !== null
        ? (rawPayload as Record<string, unknown>)
        : { rawPayload };
    const userId =
      typeof payload['actingUserId'] === 'string' ? (payload['actingUserId'] as string) : 'system';
    const entityIdRaw =
      (typeof payload['profileId'] === 'string' ? payload['profileId'] : undefined) ??
      (typeof payload['scope'] === 'string' ? payload['scope'] : undefined) ??
      (typeof payload['policyId'] === 'string' ? payload['policyId'] : undefined) ??
      (typeof payload['decisionId'] === 'string' ? payload['decisionId'] : undefined) ??
      'router';
    await this.audits.createAuditLog({
      userId,
      action,
      entityType: 'router',
      entityId: entityIdRaw,
      severity,
      details: payload,
    });
  }
}
