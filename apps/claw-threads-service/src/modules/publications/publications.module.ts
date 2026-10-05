import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PublicationOwnerController } from './controllers/publication-owner.controller';
import { PublicationsRepository } from './repositories/publications.repository';
import { PublicationLifecycleService } from './services/publication-lifecycle.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicationOwnerController],
  providers: [PublicationLifecycleService, PublicationsRepository],
})
export class PublicationsModule {}
