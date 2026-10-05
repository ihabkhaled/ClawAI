import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AccountDeletionConsumer } from './consumers/account-deletion.consumer';
import { AccountDeletionRepository } from './repositories/account-deletion.repository';
import { AccountDeletionService } from './services/account-deletion.service';

@Module({
  imports: [PrismaModule],
  providers: [AccountDeletionConsumer, AccountDeletionRepository, AccountDeletionService],
})
export class AccountDeletionModule {}
