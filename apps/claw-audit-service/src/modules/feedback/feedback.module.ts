import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FeedbackTicket, FeedbackTicketSchema } from './schemas/feedback-ticket.schema';
import { FeedbackCounter, FeedbackCounterSchema } from './schemas/feedback-counter.schema';
import { FeedbackRepository } from './repositories/feedback.repository';
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
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackRepository, FeedbackManager, FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
