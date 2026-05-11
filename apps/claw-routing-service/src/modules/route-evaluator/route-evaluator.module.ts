import { Module } from '@nestjs/common';
import { RouteEvaluatorController } from './controllers/route-evaluator.controller';
import { RouteEvaluatorService } from './services/route-evaluator.service';
import { RouteEvaluatorManager } from './managers/route-evaluator.manager';
import { ClassifierModule } from '../classifier/classifier.module';
import { ReliabilityModule } from '../reliability/reliability.module';
import { RouterModelsModule } from '../router-models/router-models.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [ClassifierModule, ReliabilityModule, RouterModelsModule, ScoringModule],
  controllers: [RouteEvaluatorController],
  providers: [RouteEvaluatorService, RouteEvaluatorManager],
  exports: [RouteEvaluatorService, RouteEvaluatorManager],
})
export class RouteEvaluatorModule {}
