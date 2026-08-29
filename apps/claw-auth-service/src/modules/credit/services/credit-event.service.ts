import { Injectable, Logger } from '@nestjs/common';
import { PAYG_WARNING_THRESHOLDS } from '@claw/shared-constants';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { type CreditSettlement } from '../types/credit.types';
import { crossedWarningThreshold } from '../utilities/credit-threshold.utility';

/**
 * Tells the rest of the platform when a balance is running out.
 *
 * Publishing is fire-and-forget and never blocks a settlement: the money has
 * already moved and the user already has their answer, so a broker hiccup must
 * not turn into a failed request. A missed warning costs a nudge; a failed
 * settlement costs the ledger's integrity.
 *
 * Payloads carry a user id and a balance together, which is exactly why nothing
 * here is logged at info level with both — a support log pairing the two is a
 * list of who is worth targeting.
 */
@Injectable()
export class CreditEventService {
  private readonly logger = new Logger(CreditEventService.name);

  constructor(private readonly rabbitmq: RabbitMQService) {}

  /**
   * Emits at most ONE event per settlement: exhausted wins over low, because a
   * user at zero does not need to be told they are nearly out.
   */
  async publishBalanceState(userId: string, settlement: CreditSettlement): Promise<void> {
    if (settlement.availableAfterMicroUsd <= 0n) {
      await this.publish(EventPattern.CREDIT_BALANCE_EXHAUSTED, userId, settlement);
      return;
    }
    const threshold = crossedWarningThreshold(
      settlement.availableAfterMicroUsd,
      settlement.periodGrantMicroUsd,
      PAYG_WARNING_THRESHOLDS,
    );
    if (threshold !== null) {
      await this.publish(EventPattern.CREDIT_BALANCE_LOW, userId, settlement);
    }
  }

  async publishGrantRenewed(
    userId: string,
    periodKey: string,
    grantMicroUsd: bigint,
  ): Promise<void> {
    try {
      await this.rabbitmq.publish(EventPattern.CREDIT_GRANT_RENEWED, {
        userId,
        periodKey,
        grantMicroUsd: grantMicroUsd.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`publishGrantRenewed: failed — ${(error as Error).message}`);
    }
  }

  private async publish(
    pattern: EventPattern,
    userId: string,
    settlement: CreditSettlement,
  ): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, {
        userId,
        // Serialised as strings: JSON has no BigInt, and `JSON.stringify`
        // throws on one rather than degrading — a publish that crashed here
        // would take the settlement's caller down with it.
        availableMicroUsd: settlement.availableAfterMicroUsd.toString(),
        periodGrantMicroUsd: settlement.periodGrantMicroUsd.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`publish: ${pattern} failed — ${(error as Error).message}`);
    }
  }
}
