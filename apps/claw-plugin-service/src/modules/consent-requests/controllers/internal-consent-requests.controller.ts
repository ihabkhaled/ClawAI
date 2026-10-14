import { Body, Controller, Header, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CONSENT_CACHE_CONTROL } from '../constants/consent-requests.constants';
import { requestIdSchema, type WaitBody, waitBodySchema } from '../dto/consent-request.dto';
import { ConsentRequestsService } from '../services/consent-requests.service';
import { type ConsentRequestView } from '../types/consent-request.types';

/**
 * chat-service waits for the user's answer here (service token, owner in the body). The wait is
 * bounded; chat-service asks again until the request's own deadline, so a parked turn never waits
 * forever and a restart of either side loses nothing: the request lives in the database.
 */
@Controller('internal/plugins/consent-requests')
@Public()
@UseGuards(ServiceTokenGuard)
export class InternalConsentRequestsController {
  constructor(private readonly service: ConsentRequestsService) {}

  @Post(':id/wait')
  @HttpCode(200)
  @Header('Cache-Control', CONSENT_CACHE_CONTROL)
  wait(
    @Param('id', new ZodValidationPipe(requestIdSchema)) id: string,
    @Body(new ZodValidationPipe(waitBodySchema)) body: WaitBody,
  ): Promise<ConsentRequestView> {
    return this.service.wait(body.userId, id, body.waitMs);
  }
}
