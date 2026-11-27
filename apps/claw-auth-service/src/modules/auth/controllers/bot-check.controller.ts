import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type BotCheckConfigQueryDto,
  botCheckConfigQuerySchema,
} from '../../anti-abuse/dto/anti-abuse.dto';
import { BotCheckService } from '../../anti-abuse/services/bot-check.service';
import type { BotCheckConfigView, PowChallengeView } from '../../anti-abuse/types/bot-check.types';
import { AuthRateLimit } from '../decorators/auth-rate-limit.decorator';
import { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';

/**
 * What a sign-up / sign-in form must solve before it posts (anti-abuse,
 * 2026-11-27). Both routes are public: the visitor has no session yet. The
 * config carries site keys only, never a secret. A challenge is stateless and
 * cheap to mint, but still has its own per-IP budget (rules/58).
 */
@Controller('auth/bot-check')
export class BotCheckController {
  constructor(private readonly botCheck: BotCheckService) {}

  @Public()
  @Get('config')
  @AuthRateLimit(AuthRateLimitPolicy.BOT_CHECK_CONFIG)
  async config(
    @Query(new ZodValidationPipe(botCheckConfigQuerySchema)) query: BotCheckConfigQueryDto,
  ): Promise<BotCheckConfigView> {
    return this.botCheck.getConfig(query.action);
  }

  @Public()
  @Post('challenge')
  @AuthRateLimit(AuthRateLimitPolicy.BOT_CHECK_CHALLENGE)
  @HttpCode(HttpStatus.OK)
  async challenge(): Promise<PowChallengeView> {
    return this.botCheck.issueChallenge();
  }
}
