import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { RouteEvaluatorService } from '../services/route-evaluator.service';
import { type EvaluateV2Dto, evaluateV2Schema } from '../dto/evaluate-v2.dto';
import { type RoutingDecisionV2 } from '../types/route-evaluator.types';

/// Phase 8 prep: a /evaluate-shadow endpoint chat-service can call AFTER
/// it has executed the legacy /evaluate path. The response is the V2
/// decision for the same prompt — used to log the delta between v1 and
/// v2 routing decisions over real traffic without changing behavior.
/// Once enough data shows v2 is correct, chat-service migrates from
/// /evaluate to /evaluate-v2 and this shadow endpoint is removed.
@Controller('routing/evaluate-shadow')
export class EvaluateShadowController {
  constructor(private readonly service: RouteEvaluatorService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async evaluateShadow(
    @Body(new ZodValidationPipe(evaluateV2Schema)) dto: EvaluateV2Dto,
  ): Promise<RoutingDecisionV2> {
    return this.service.evaluate(dto);
  }
}
