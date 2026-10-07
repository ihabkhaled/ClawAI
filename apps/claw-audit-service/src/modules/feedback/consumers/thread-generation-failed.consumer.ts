import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, FeedbackType, type ThreadGenerationFailedPayload } from '@claw/shared-types';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { FeedbackManager } from '../managers/feedback.manager';
import {
  renderThreadFailureTicket,
  threadFailureExternalKey,
  threadFailureTitle,
} from '../utilities/thread-failure-ticket.utility';

/**
 * Opens one operator ticket per Threads job that ended FAILED.
 *
 * The event is built from safe fields only (see ThreadGenerationFailedPayload), and
 * the ticket is keyed on the job id, so a redelivered message finds the ticket it
 * already opened. Nothing is rethrown: generation-service has already failed the
 * job and released its credits, and re-failing would only dead-letter the message.
 */
@Injectable()
export class ThreadGenerationFailedConsumer implements OnModuleInit {
  private readonly logger = new Logger(ThreadGenerationFailedConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly feedback: FeedbackManager,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.THREAD_GENERATION_FAILED, (raw) =>
      this.handle(raw as ThreadGenerationFailedPayload),
    );
    this.logger.log(`Subscribed to event: ${EventPattern.THREAD_GENERATION_FAILED}`);
  }

  async handle(payload: ThreadGenerationFailedPayload): Promise<void> {
    try {
      const ticket = await this.feedback.createSystemTicket({
        externalKey: threadFailureExternalKey(payload.jobId),
        type: FeedbackType.BUG_REPORT,
        title: threadFailureTitle(payload),
        contentMarkdown: renderThreadFailureTicket(payload),
      });
      this.logger.log(
        ticket.created
          ? `Opened ticket ${ticket.ticketNumber} for failed Threads job ${payload.jobId}`
          : `Ticket ${ticket.ticketNumber} already exists for failed Threads job ${payload.jobId}`,
      );
    } catch {
      this.logger.error(`Could not open a ticket for failed Threads job ${payload.jobId}`);
    }
  }
}
