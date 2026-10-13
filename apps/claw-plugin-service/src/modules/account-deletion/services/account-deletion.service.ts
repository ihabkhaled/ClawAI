import { Injectable, Logger } from '@nestjs/common';

import { AccountDeletionRepository } from '../repositories/account-deletion.repository';
import { userDeletedEventSchema } from '../schemas/user-deleted-event.schema';

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(private readonly repository: AccountDeletionRepository) {}

  /** Deletes the user's plugin data. The log carries the event id and counts, never the account id. */
  async handle(rawEvent: unknown): Promise<void> {
    const parsed = userDeletedEventSchema.safeParse(rawEvent);
    if (!parsed.success) throw new Error('Invalid user deletion event');
    const counts = await this.repository.deleteAllForUser(parsed.data.userId);
    this.logger.log(
      `handle: event=${parsed.data.eventId} installs=${String(counts.installs)} credentials=${String(counts.credentials)} consents=${String(counts.consents)} invocations=${String(counts.invocations)}`,
    );
  }
}
