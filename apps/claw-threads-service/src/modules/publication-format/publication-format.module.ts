import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PublicationFormatController } from './controllers/publication-format.controller';
import { FormatPassRepository } from './repositories/format-pass.repository';
import { PublicationFormatService } from './services/publication-format.service';
import { ThreadsFormatClient } from './services/threads-format.client';

@Module({
  imports: [PrismaModule],
  controllers: [PublicationFormatController],
  providers: [FormatPassRepository, PublicationFormatService, ThreadsFormatClient],
})
export class PublicationFormatModule {}
