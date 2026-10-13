import { ServiceUnavailableException } from '@nestjs/common';

/**
 * The gateway answered, so the provider may have been paid, but the answer cannot be used
 * (cut short by the balance, or unreadable). `costMicroUsd` is what the gateway reported for the
 * call, so the spend is still counted even though the step fails.
 */
export class ChatModelIncompleteError extends ServiceUnavailableException {
  constructor(readonly costMicroUsd: number) {
    super('Chat model response was incomplete');
  }
}
