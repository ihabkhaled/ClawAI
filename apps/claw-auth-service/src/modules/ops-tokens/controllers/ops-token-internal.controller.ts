import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type VerifyOpsTokenDto, verifyOpsTokenSchema } from '../dto/ops-token.dto';
import { OpsTokenService } from '../services/ops-token.service';
import type { OpsTokenVerification } from '../types/ops-token.types';

/**
 * Called by services that serve /api/v1/ops/* to check a presented token.
 * Service-token authenticated; not routed through nginx.
 */
@Controller('internal/ops-tokens')
@Public()
@UseGuards(ServiceTokenGuard)
export class OpsTokenInternalController {
  constructor(private readonly opsTokens: OpsTokenService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body(new ZodValidationPipe(verifyOpsTokenSchema)) dto: VerifyOpsTokenDto,
  ): Promise<OpsTokenVerification> {
    return this.opsTokens.verify(dto.token, dto.scope);
  }
}
