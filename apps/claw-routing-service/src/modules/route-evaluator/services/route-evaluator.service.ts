import { Injectable } from '@nestjs/common';
import { RouteEvaluatorManager } from '../managers/route-evaluator.manager';
import { type EvaluateV2Dto } from '../dto/evaluate-v2.dto';
import { type RoutingDecisionV2 } from '../types/route-evaluator.types';

@Injectable()
export class RouteEvaluatorService {
  constructor(private readonly manager: RouteEvaluatorManager) {}

  async evaluate(dto: EvaluateV2Dto): Promise<RoutingDecisionV2> {
    return this.manager.evaluate(dto);
  }
}
