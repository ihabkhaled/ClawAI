import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminUserBillingController } from './controllers/admin-user-billing.controller';
import { AdminUserBillingService } from './services/admin-user-billing.service';

// Reuses the subscription and invoice repositories rather than declaring its
// own: one place decides how billing rows are read, so an ownership scope
// cannot drift between the customer surface and the admin one.
@Module({
  imports: [SubscriptionsModule],
  controllers: [AdminUserBillingController],
  providers: [AdminUserBillingService],
})
export class AdminUserBillingModule {}
