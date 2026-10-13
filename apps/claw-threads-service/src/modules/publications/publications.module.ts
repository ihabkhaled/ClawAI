import { Module } from '@nestjs/common';

import { BoardIndexModule } from '../board-index/board-index.module';
import { PublicationModerationModule } from '../publication-moderation/publication-moderation.module';
import { PublicationCommunityModule } from '../publication-community/publication-community.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PublicationOwnerController } from './controllers/publication-owner.controller';
import { PublicationsRepository } from './repositories/publications.repository';
import { PublicationLifecycleService } from './services/publication-lifecycle.service';
import { ThreadsGenerationClient } from './services/threads-generation.client';
import { PublicationGenerationController } from './controllers/publication-generation.controller';
import { PublicationPublicController } from './controllers/publication-public.controller';
import { PublicationCommunityController } from './controllers/publication-community.controller';
import { PublicationModerationController } from './controllers/publication-moderation.controller';
import { PublicationCommunityService } from './services/publication-community.service';
import { PublicationReportModerationService } from './services/publication-report-moderation.service';
import { PublicationListController } from './controllers/publication-list.controller';
import { PublicationDiscoveryController } from './controllers/publication-discovery.controller';
import { PublicationDiscoveryService } from './services/publication-discovery.service';
import { PublicationViewsController } from './controllers/publication-views.controller';
import { PublicationViewsRepository } from './repositories/publication-views.repository';
import { PublicationViewsService } from './services/publication-views.service';
import { ThreadGenerationEventsConsumer } from './consumers/thread-generation-events.consumer';
import { PublicationGenerationOwnerService } from './services/publication-generation-owner.service';
import { PublicationGenerationStartService } from './services/publication-generation-start.service';
import { GenerationPreflightService } from './services/generation-preflight.service';
import { ModelCatalogClient } from './services/model-catalog.client';
import { ThreadNotificationService } from './services/thread-notification.service';
import { GenerationActiveCapService } from './services/generation-active-cap.service';
import { GenerationOrphanRepairService } from './services/generation-orphan-repair.service';
import { GenerationStartGate } from './services/generation-start-gate.service';
import { PublicationGenerationRepairController } from './controllers/publication-generation-repair.controller';

@Module({
  imports: [
    PrismaModule,
    BoardIndexModule,
    PublicationModerationModule,
    PublicationCommunityModule,
  ],
  controllers: [
    PublicationOwnerController,
    PublicationGenerationController,
    PublicationDiscoveryController,
    PublicationPublicController,
    PublicationCommunityController,
    PublicationModerationController,
    PublicationGenerationRepairController,
    PublicationListController,
    PublicationViewsController,
  ],
  providers: [
    ThreadNotificationService,
    ThreadGenerationEventsConsumer,
    PublicationLifecycleService,
    PublicationGenerationOwnerService,
    PublicationGenerationStartService,
    GenerationPreflightService,
    GenerationActiveCapService,
    GenerationOrphanRepairService,
    GenerationStartGate,
    ModelCatalogClient,
    PublicationCommunityService,
    PublicationReportModerationService,
    PublicationsRepository,
    ThreadsGenerationClient,
    PublicationDiscoveryService,
    PublicationViewsRepository,
    PublicationViewsService,
  ],
})
export class PublicationsModule {}
