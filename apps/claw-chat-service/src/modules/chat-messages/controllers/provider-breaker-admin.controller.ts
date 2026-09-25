import { Controller, Delete, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type ProviderBreakerParamsDto,
  providerBreakerParamsSchema,
} from '../dto/provider-breaker-params.dto';
import { ProviderBreakerAdminService } from '../services/provider-breaker-admin.service';
import {
  type ClearProviderBreakerResponse,
  type SkippedProvidersResponse,
} from '../types/provider-circuit-breaker.types';

/**
 * Providers the account-exhaustion breaker is skipping (ADR-125 addendum).
 * ADMIN only — the global RolesGuard enforces `@Roles` on the class.
 */
@Controller('chat-messages/admin/provider-breakers')
@Roles(UserRole.ADMIN)
export class ProviderBreakerAdminController {
  constructor(private readonly admin: ProviderBreakerAdminService) {}

  @Get()
  async list(): Promise<SkippedProvidersResponse> {
    return this.admin.listSkipped();
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.OK)
  async clear(
    @Param(new ZodValidationPipe(providerBreakerParamsSchema)) params: ProviderBreakerParamsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClearProviderBreakerResponse> {
    return this.admin.clear(params.provider, user.id);
  }
}
