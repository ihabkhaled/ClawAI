import { Module } from '@nestjs/common';
import { ArtifactsController } from './controllers/artifacts.controller';
import { PublicArtifactsController } from './controllers/public-artifacts.controller';
import { PublishedArtifactsRepository } from './repositories/published-artifacts.repository';
import { ArtifactsService } from './services/artifacts.service';

/** F025 — hosted, read-only pages published from the coding agent. */
@Module({
  controllers: [ArtifactsController, PublicArtifactsController],
  providers: [ArtifactsService, PublishedArtifactsRepository],
})
export class ArtifactsModule {}
