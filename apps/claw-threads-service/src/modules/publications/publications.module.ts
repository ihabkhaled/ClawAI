import { Module } from '@nestjs/common';

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
import { PublicationListController } from './controllers/publication-list.controller';
import { PublicationDiscoveryController } from './controllers/publication-discovery.controller';
import { PublicationDiscoveryService } from './services/publication-discovery.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicationOwnerController,
    PublicationGenerationController,
    PublicationDiscoveryController,
    PublicationPublicController,
    PublicationCommunityController,
    PublicationModerationController,
    PublicationListController,
  ],
  providers: [
    PublicationLifecycleService,
    PublicationCommunityService,
    PublicationsRepository,
    ThreadsGenerationClient,
    PublicationDiscoveryService,
  ],
})
export class PublicationsModule {}
