import { Module } from '@nestjs/common';
import { ClassifierModule } from '../classifier/classifier.module';
import { ReliabilityModule } from '../reliability/reliability.module';
import { RouterModelsModule } from '../router-models/router-models.module';
import { RoutingModule } from '../routing/routing.module';
import { ScoringModule } from '../scoring/scoring.module';
import { EvaluateShadowController } from './controllers/evaluate-shadow.controller';
import { RouteEvaluatorController } from './controllers/route-evaluator.controller';
import { RouteEvaluatorManager } from './managers/route-evaluator.manager';
import { RouteEvaluatorService } from './services/route-evaluator.service';

@Module({
  imports: [ClassifierModule, ReliabilityModule, RouterModelsModule, RoutingModule, ScoringModule],
  controllers: [RouteEvaluatorController, EvaluateShadowController],
  providers: [RouteEvaluatorService, RouteEvaluatorManager],
  exports: [RouteEvaluatorService, RouteEvaluatorManager],
})
export class RouteEvaluatorModule {}
