import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PublicationTranslationsRepository } from './repositories/publication-translations.repository';
import { PublicationTranslationWorkerService } from './services/publication-translation-worker.service';
import { TranslationModelClient } from './services/translation-model.client';

@Module({
  imports: [PrismaModule],
  providers: [
    PublicationTranslationsRepository,
    PublicationTranslationWorkerService,
    TranslationModelClient,
  ],
  exports: [PublicationTranslationsRepository],
})
export class PublicationTranslationsModule {}
