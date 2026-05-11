import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { RouteEvaluatorService } from '../services/route-evaluator.service';
import { type EvaluateV2Dto, evaluateV2Schema } from '../dto/evaluate-v2.dto';
import { type RoutingDecisionV2 } from '../types/route-evaluator.types';

@Controller('routing/evaluate-v2')
export class RouteEvaluatorController {
  constructor(private readonly service: RouteEvaluatorService) {}

  @Post()
  async evaluate(
    @Body(new ZodValidationPipe(evaluateV2Schema)) dto: EvaluateV2Dto,
  ): Promise<RoutingDecisionV2> {
    return this.service.evaluate(dto);
  }
}
