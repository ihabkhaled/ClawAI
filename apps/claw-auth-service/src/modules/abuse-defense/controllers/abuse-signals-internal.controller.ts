import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AbuseSignalBodyDto, abuseSignalBodySchema } from '../dto/abuse-signal.dto';
import { AbuseSignalService } from '../services/abuse-signal.service';

/**
 * Other services report that an account's OWN valid token did something abusive (an SSRF refusal,
 * a flood of 429s, a probe of routes it may not use). @Public for the JWT guard, then
 * ServiceTokenGuard (TD-035); nginx does not proxy /api/v1/internal/*. The answer is always the
 * same 202, so a reporter learns nothing about thresholds or the account's standing.
 */
@Controller('internal/abuse')
@Public()
@UseGuards(ServiceTokenGuard)
export class AbuseSignalsInternalController {
  constructor(private readonly signals: AbuseSignalService) {}

  @Post('signals')
  @HttpCode(202)
  async report(
    @Body(new ZodValidationPipe(abuseSignalBodySchema)) body: AbuseSignalBodyDto,
  ): Promise<{ accepted: true }> {
    await this.signals.record(body);
    return { accepted: true };
  }
}
