import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { RecipeRunnerManager } from './recipe-runner.manager';
import type { CapabilityTerminalEventPayload } from '../types/recipe-event.types';

/**
 * Stream 13 — RabbitMQ subscriber that bridges capability lifecycle
 * events back into the recipe runner. When a step's invocation reaches
 * a terminal status (EXECUTED / FAILED / DENIED), the consumer asks
 * the runner to advance the run.
 *
 * Subscribes only to the three terminal events that affect a run; the
 * intermediate events (PROPOSED / APPROVED / EXECUTING / etc.) are
 * already handled by the audit service and don't change runner state.
 */
@Injectable()
export class RecipeEventConsumerManager implements OnModuleInit {
  private readonly logger = new Logger(RecipeEventConsumerManager.name);

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    private readonly runner: RecipeRunnerManager,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQ.subscribe(EventPattern.AGENT_CAPABILITY_EXECUTED, (data: unknown) =>
      this.handleTerminal(data as CapabilityTerminalEventPayload, CapabilityInvocationStatus.EXECUTED),
    );
    await this.rabbitMQ.subscribe(EventPattern.AGENT_CAPABILITY_FAILED, (data: unknown) =>
      this.handleTerminal(data as CapabilityTerminalEventPayload, CapabilityInvocationStatus.FAILED),
    );
    await this.rabbitMQ.subscribe(EventPattern.AGENT_CAPABILITY_DENIED, (data: unknown) =>
      this.handleTerminal(data as CapabilityTerminalEventPayload, CapabilityInvocationStatus.DENIED),
    );
    this.logger.log('Subscribed to capability terminal events for recipe runner');
  }

  private async handleTerminal(
    payload: CapabilityTerminalEventPayload,
    status: CapabilityInvocationStatus,
  ): Promise<void> {
    if (typeof payload?.invocationId !== 'string' || payload.invocationId.length === 0) {
      this.logger.warn(`handleTerminal: payload missing invocationId — skipping`);
      return;
    }
    // Recipe runner only cares about invocations with a recipeRunId.
    // The runner's onStepInvocationTerminated handler short-circuits on
    // non-recipe invocations via findStepByInvocationId returning null,
    // so we forward all events and let the runner filter.
    try {
      await this.runner.onStepInvocationTerminated(
        payload.invocationId,
        status,
        payload.executionResult ?? null,
        payload.errorMessage ?? null,
      );
    } catch (error) {
      this.logger.error(
        `handleTerminal: runner failed for invocationId=${payload.invocationId}: ${(error as Error).message}`,
      );
    }
  }
}
