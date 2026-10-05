import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { AccountDeletionService } from '../services/account-deletion.service';

@Injectable()
export class AccountDeletionConsumer implements OnModuleInit {
  private readonly logger = new Logger(AccountDeletionConsumer.name);

  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.subscribe(EventPattern.USER_DELETED, async (event) => {
      try {
        await this.accountDeletion.handle(event);
      } catch {
        this.logger.error('onUserDeleted: processing failed');
        throw new Error('Account deletion processing failed');
      }
    });
  }
}
