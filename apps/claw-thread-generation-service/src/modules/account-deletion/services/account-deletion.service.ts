import { Injectable, Logger } from '@nestjs/common';
import { AccountDeletionRepository } from '../repositories/account-deletion.repository';
import { userDeletedEventSchema } from '../schemas/user-deleted-event.schema';

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(private readonly repository: AccountDeletionRepository) {}

  async handle(rawEvent: unknown): Promise<void> {
    const parsed = userDeletedEventSchema.safeParse(rawEvent);
    if (!parsed.success) throw new Error('Invalid user deletion event');
    const event = parsed.data;
    const applied = await this.repository.applyDeletion(
      event.userId,
      event.eventId,
      new Date(event.deletedAt),
    );
    this.logger.log(`handle: event=${event.eventId} outcome=${applied ? 'applied' : 'duplicate'}`);
  }
}
