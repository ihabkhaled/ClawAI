import { Module } from '@nestjs/common';
import { ScoringController } from './controllers/scoring.controller';
import { ScoringService } from './services/scoring.service';
import { ScoringEngineManager } from './managers/scoring-engine.manager';
import { RouterModelsModule } from '../router-models/router-models.module';

@Module({
  imports: [RouterModelsModule],
  controllers: [ScoringController],
  providers: [ScoringService, ScoringEngineManager],
  exports: [ScoringService, ScoringEngineManager],
})
export class ScoringModule {}
