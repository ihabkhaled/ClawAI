import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PublicationOwnerController } from './controllers/publication-owner.controller';
import { PublicationsRepository } from './repositories/publications.repository';
import { PublicationLifecycleService } from './services/publication-lifecycle.service';
import { ThreadsGenerationClient } from './services/threads-generation.client';
import { PublicationGenerationController } from './controllers/publication-generation.controller';
import { PublicationPublicController } from './controllers/publication-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicationOwnerController,
    PublicationGenerationController,
    PublicationPublicController,
  ],
  providers: [PublicationLifecycleService, PublicationsRepository, ThreadsGenerationClient],
})
export class PublicationsModule {}
