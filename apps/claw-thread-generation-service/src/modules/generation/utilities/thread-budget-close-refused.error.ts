import { ServiceUnavailableException } from '@nestjs/common';

/**
 * The budget service answered but did not close the budget (it returns null while a model call
 * of the job is still reserved). Unlike an outage this will not clear by retrying at once.
 */
export class ThreadBudgetCloseRefusedError extends ServiceUnavailableException {
  constructor() {
    super('Threads budget could not be closed');
    this.name = 'ThreadBudgetCloseRefusedError';
  }
}
