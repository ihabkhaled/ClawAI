import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { historyIdParamSchema } from '../../history/dto/history.dto';
import { type EnhanceBody, enhanceBodySchema } from '../dto/enhance.dto';
import { EnhanceService } from '../services/enhance.service';
import type { EnhanceEstimateView, EnhanceResultView } from '../types/enhance.types';

@Controller('live/events')
export class EnhanceController {
  constructor(private readonly enhancer: EnhanceService) {}

  @Post(':eventId/enhance')
  @HttpCode(HttpStatus.OK)
  enhance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ZodValidationPipe(historyIdParamSchema)) eventId: string,
    @Body(new ZodValidationPipe(enhanceBodySchema)) body: EnhanceBody,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<EnhanceEstimateView | EnhanceResultView> {
    return this.enhancer.enhance(user.id, eventId, body, idempotencyKey);
  }
}
