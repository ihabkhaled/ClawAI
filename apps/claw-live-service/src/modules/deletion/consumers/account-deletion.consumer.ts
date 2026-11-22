import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { DeletionService } from '../services/deletion.service';

@Injectable()
export class AccountDeletionConsumer implements OnModuleInit {
  private readonly logger = new Logger(AccountDeletionConsumer.name);

  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly deletion: DeletionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.subscribe(EventPattern.USER_DELETED, async (event) => {
      try {
        await this.deletion.handleUserDeleted(event);
      } catch {
        this.logger.error('onUserDeleted: processing failed');
        throw new Error('Account deletion processing failed');
      }
    });
  }
}
