import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '@claw/shared-auth';
import { UserRole } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RegenerateDigestDto,
  regenerateDigestSchema,
  type UpdateDigestPreferenceDto,
  updateDigestPreferenceSchema,
} from '../dto/digest.dto';
import { DigestOrchestratorManager } from '../managers/digest-orchestrator.manager';
import { DigestService } from '../services/digest.service';
import { parseDigestScope } from '../utilities/digest-scope.utility';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { DigestPreferenceView, DigestSnapshotPayload } from '../types/digest.types';

@Controller('workspace/digests')
export class DigestController {
  constructor(
    private readonly service: DigestService,
    private readonly orchestrator: DigestOrchestratorManager,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('scope') scopeRaw: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ): Promise<DigestSnapshotPayload[]> {
    const scope = parseDigestScope(scopeRaw ?? 'DAILY');
    const limit = limitRaw === undefined ? 14 : Math.max(1, Math.min(100, Number(limitRaw)));
    return this.service.listForUser(user.id, scope, limit);
  }

  @Get('today')
  @HttpCode(HttpStatus.OK)
  async today(@CurrentUser() user: AuthenticatedUser): Promise<DigestSnapshotPayload | null> {
    return this.service.getToday(user.id, 'DAILY', new Date());
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  async getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<DigestPreferenceView> {
    return this.service.getPreference(user.id);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateDigestPreferenceSchema)) dto: UpdateDigestPreferenceDto,
  ): Promise<DigestPreferenceView> {
    return this.service.upsertPreference({ userId: user.id, ...dto });
  }

  @Post('regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.ADMIN)
  async regenerate(
    @Body(new ZodValidationPipe(regenerateDigestSchema)) dto: RegenerateDigestDto,
  ): Promise<{ status: 'STARTED' }> {
    const date = dto.date !== undefined ? new Date(dto.date) : new Date();
    void this.orchestrator.triggerForUser(dto.userId, dto.scope, date);
    return { status: 'STARTED' };
  }

  @Post('trigger-mine')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('scope') scopeRaw: string | undefined,
  ): Promise<{ status: 'STARTED' }> {
    const scope = parseDigestScope(scopeRaw ?? 'DAILY');
    void this.orchestrator.triggerForUser(user.id, scope, new Date());
    return { status: 'STARTED' };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DigestSnapshotPayload | null> {
    const snapshots = await this.service.listForUser(user.id, 'DAILY', 100);
    const allWeekly = await this.service.listForUser(user.id, 'WEEKLY', 100);
    return [...snapshots, ...allWeekly].find((s) => s.id === id) ?? null;
  }
}
