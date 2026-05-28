import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { EntitlementsService } from '../../entitlements/services/entitlements.service';
import { QuotaService } from '../services/quota.service';
import {
  FinalizeQuotaDto,
  finalizeQuotaSchema,
  ReleaseQuotaDto,
  releaseQuotaSchema,
  ReserveQuotaDto,
  reserveQuotaSchema,
} from '../dto/quota.dto';
import { type ReserveResult } from '../types/quota.types';

// Internal service-to-service endpoints (chat-service calls these around model
// execution). Not exposed via nginx; @Public because the caller holds no
// per-request user JWT — it acts on behalf of an already-authenticated user.
@Controller('internal/quota')
@Public()
export class QuotaInternalController {
  constructor(
    private readonly quotaService: QuotaService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  async reserve(
    @Body(new ZodValidationPipe(reserveQuotaSchema)) dto: ReserveQuotaDto,
  ): Promise<ReserveResult> {
    const { dailyLimit, isAdmin } = await this.entitlementsService.resolveDailyLimit(dto.userId);
    if (isAdmin) {
      return { ok: true, reservationId: 'admin-bypass', estimate: 0 };
    }
    return this.quotaService.reserve(dto.userId, dailyLimit, dto.estimatedTokens);
  }

  @Post('finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  async finalize(
    @Body(new ZodValidationPipe(finalizeQuotaSchema)) dto: FinalizeQuotaDto,
  ): Promise<void> {
    await this.quotaService.finalize({
      userId: dto.userId,
      planId: dto.planId ?? null,
      reservationId: '',
      estimate: dto.estimatedTokens,
      actualTotalTokens: dto.inputTokens + dto.outputTokens,
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
      provider: dto.provider,
      model: dto.model,
    });
  }

  @Post('release')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(
    @Body(new ZodValidationPipe(releaseQuotaSchema)) dto: ReleaseQuotaDto,
  ): Promise<void> {
    await this.quotaService.release(dto.userId, dto.estimatedTokens);
  }
}
