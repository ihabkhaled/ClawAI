import { Module } from '@nestjs/common';

import { AccountDeletionConsumer } from './consumers/account-deletion.consumer';
import { AccountDeletionRepository } from './repositories/account-deletion.repository';
import { AccountDeletionService } from './services/account-deletion.service';

@Module({
  providers: [AccountDeletionConsumer, AccountDeletionRepository, AccountDeletionService],
})
export class AccountDeletionModule {}
