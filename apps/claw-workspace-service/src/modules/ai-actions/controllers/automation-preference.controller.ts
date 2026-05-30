import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { AppConfig } from '../../../app/config/app.config';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type UpsertAutomationPreferenceDto,
  upsertAutomationPreferenceSchema,
} from '../dto/automation-preference.dto';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { AutomationPreferenceService } from '../services/automation-preference.service';
import type {
  AutomationPreferenceUserView,
  LearnedPreferenceItem,
} from '../types/automation-preference.types';
import { parseAiActionKind } from '../utilities/ai-action-kind.utility';

// Automation preferences are per-USER settings — users tune their own thresholds. No admin gate.
// Service layer scopes every read/write by @CurrentUser.
@Controller('workspace/automation-preferences')
export class AutomationPreferenceController {
  constructor(private readonly service: AutomationPreferenceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<AutomationPreferenceUserView[]> {
    return this.service.listForUser(user.id);
  }

  @Put(':actionKind')
  @HttpCode(HttpStatus.OK)
  async upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionKind') actionKindRaw: string,
    @Body(new ZodValidationPipe(upsertAutomationPreferenceSchema))
    dto: UpsertAutomationPreferenceDto,
  ): Promise<AutomationPreferenceUserView> {
    const actionKind = parseAiActionKind(actionKindRaw);
    return this.service.upsert({
      userId: user.id,
      actionKind,
      isEnabled: dto.isEnabled,
      autoApproveBelowRiskScore: dto.autoApproveBelowRiskScore,
      perDayBudget: dto.perDayBudget,
      providers: dto.providers,
    });
  }

  /**
   * Stream 40.3 — proxy to memory-service `/internal/memories/learned-preferences`
   * so the frontend can browse "what we've learned" PREFERENCEs without
   * needing the service token.
   */
  @Get('learned')
  @HttpCode(HttpStatus.OK)
  async getLearned(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actionKind') actionKind: string | undefined,
    @Query('limit') limit: string | undefined,
  ): Promise<LearnedPreferenceItem[]> {
    const params = new URLSearchParams();
    params.set('userId', user.id);
    if (actionKind !== undefined && actionKind.length > 0) {
      params.set('actionKind', actionKind);
    }
    if (limit !== undefined) {
      params.set('limit', limit);
    }
    const url = `${AppConfig.get().MEMORY_SERVICE_URL}/api/v1/internal/memories/learned-preferences?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return [];
    }
    const rows = (await response.json()) as Array<{
      id: string;
      content: string;
      type: string;
      createdAt: string;
      updatedAt: string;
    }>;
    return rows;
  }
}
