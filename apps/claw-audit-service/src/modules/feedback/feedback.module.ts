import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FeedbackTicket, FeedbackTicketSchema } from './schemas/feedback-ticket.schema';
import { FeedbackCounter, FeedbackCounterSchema } from './schemas/feedback-counter.schema';
import { FeedbackRepository } from './repositories/feedback.repository';
import { FeedbackRateLimitRepository } from './repositories/feedback-rate-limit.repository';
import { UserIdentityClient } from './clients/user-identity.client';
import { FeedbackPublicManager } from './managers/feedback-public.manager';
import { FeedbackSourceBackfillMigration } from './migrations/feedback-source-backfill.migration';
import { FeedbackPublicController } from './controllers/feedback-public.controller';
import { FeedbackManager } from './managers/feedback.manager';
import { FeedbackService } from './services/feedback.service';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackAdminController } from './controllers/feedback-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedbackTicket.name, schema: FeedbackTicketSchema },
      { name: FeedbackCounter.name, schema: FeedbackCounterSchema },
    ]),
  ],
  controllers: [FeedbackController, FeedbackAdminController, FeedbackPublicController],
  providers: [
    FeedbackRepository,
    FeedbackRateLimitRepository,
    UserIdentityClient,
    FeedbackManager,
    FeedbackPublicManager,
    FeedbackService,
    FeedbackSourceBackfillMigration,
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
