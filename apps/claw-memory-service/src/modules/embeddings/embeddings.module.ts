import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';

import { EmbeddingsController } from './controllers/embeddings.controller';
import { WorkspaceObjectEmbeddingRepository } from './repositories/workspace-object-embedding.repository';
import { EmbeddingsService } from './services/embeddings.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService, WorkspaceObjectEmbeddingRepository],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
