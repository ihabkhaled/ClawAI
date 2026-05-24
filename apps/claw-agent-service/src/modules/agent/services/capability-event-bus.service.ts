import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  type CapabilityApprovedPayload,
  type CapabilityAutoApprovedPayload,
  type CapabilityCancelledPayload,
  type CapabilityDeniedPayload,
  type CapabilityExecutedPayload,
  type CapabilityExecutingPayload,
  type CapabilityExpiredPayload,
  type CapabilityFailedPayload,
  type CapabilityProposedPayload,
  type CapabilityRejectedPayload,
  type CapabilityRolledBackPayload,
  EventPattern,
} from '@claw/shared-types';
import { Subject } from 'rxjs';

import type {
  CapabilityStreamEvent,
  CapabilityStreamEventType,
} from '../types/capability-stream.types';

/**
 * V2 Stream 08 — in-process capability event bus.
 *
 * Subscribes to every CAPABILITY_* RabbitMQ event the agent service
 * publishes, fans them out to an RxJS Subject. The SSE controller
 * filters by `userId` and emits per-connection.
 *
 * Why in-process: same reason as the audit consumer — agent-service is
 * a single, sticky workspace per user. The chat-service uses the same
 * pattern for ChatStreamController. Cluster-aware fanout would require
 * a Redis pub/sub bridge; deferred to Stream 08.x.
 */
@Injectable()
export class CapabilityEventBusService implements OnModuleInit {
  private readonly logger = new Logger(CapabilityEventBusService.name);
  readonly eventBus = new Subject<CapabilityStreamEvent>();

  constructor(private readonly rabbitMQ: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    for (const [pattern, type] of this.subscriptions()) {
      await this.rabbitMQ.subscribe(pattern, (data) => this.handle(type, data));
      this.logger.log(`event-bus subscribed: ${pattern}`);
    }
  }

  private subscriptions(): Array<[EventPattern, CapabilityStreamEventType]> {
    return [
      [EventPattern.AGENT_CAPABILITY_PROPOSED, 'proposed'],
      [EventPattern.AGENT_CAPABILITY_AUTO_APPROVED, 'auto_approved'],
      [EventPattern.AGENT_CAPABILITY_APPROVED, 'approved'],
      [EventPattern.AGENT_CAPABILITY_REJECTED, 'rejected'],
      [EventPattern.AGENT_CAPABILITY_EXECUTING, 'executing'],
      [EventPattern.AGENT_CAPABILITY_EXECUTED, 'executed'],
      [EventPattern.AGENT_CAPABILITY_FAILED, 'failed'],
      [EventPattern.AGENT_CAPABILITY_CANCELLED, 'cancelled'],
      [EventPattern.AGENT_CAPABILITY_EXPIRED, 'expired'],
      [EventPattern.AGENT_CAPABILITY_ROLLED_BACK, 'rolled_back'],
      [EventPattern.AGENT_CAPABILITY_DENIED, 'denied'],
    ];
  }

  private handle(type: CapabilityStreamEventType, data: unknown): Promise<void> {
    const payload = data as
      | CapabilityProposedPayload
      | CapabilityAutoApprovedPayload
      | CapabilityApprovedPayload
      | CapabilityRejectedPayload
      | CapabilityExecutingPayload
      | CapabilityExecutedPayload
      | CapabilityFailedPayload
      | CapabilityCancelledPayload
      | CapabilityExpiredPayload
      | CapabilityRolledBackPayload
      | CapabilityDeniedPayload;
    const userId = 'userId' in payload && typeof payload.userId === 'string' ? payload.userId : null;
    if (userId === null) {
      this.logger.warn(`event-bus dropped: type=${type} has no userId`);
      return Promise.resolve();
    }
    this.eventBus.next({
      type,
      invocationId: payload.invocationId,
      userId,
      deviceId: 'deviceId' in payload ? payload.deviceId : null,
      capabilityClass: 'capabilityClass' in payload ? payload.capabilityClass : null,
      capabilityOperation:
        'capabilityOperation' in payload ? payload.capabilityOperation : null,
      timestamp: new Date().toISOString(),
    });
    return Promise.resolve();
  }
}
