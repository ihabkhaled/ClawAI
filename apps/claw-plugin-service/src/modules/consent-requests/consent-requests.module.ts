import { Module } from '@nestjs/common';

import {
  ChatGrantsController,
  ConsentRequestsController,
} from './controllers/consent-requests.controller';
import { InternalConsentRequestsController } from './controllers/internal-consent-requests.controller';
import { ConsentFlowManager } from './managers/consent-flow.manager';
import { ChatConsentsRepository } from './repositories/chat-consents.repository';
import { ConsentRequestsRepository } from './repositories/consent-requests.repository';
import { ConsentRequestsService } from './services/consent-requests.service';

/** The in-chat consent card: requests, "for this chat" grants, the decision and wait routes. */
@Module({
  controllers: [ConsentRequestsController, ChatGrantsController, InternalConsentRequestsController],
  providers: [
    ConsentRequestsService,
    ConsentFlowManager,
    ConsentRequestsRepository,
    ChatConsentsRepository,
  ],
  exports: [ConsentFlowManager],
})
export class ConsentRequestsModule {}
