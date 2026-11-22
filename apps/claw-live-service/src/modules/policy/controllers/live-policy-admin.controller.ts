import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { PermissionGuard, RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type PutPolicyBody,
  putPolicyBodySchema,
  type RollbackPolicyBody,
  rollbackPolicyBodySchema,
} from '../dto/live-policy-admin.dto';
import { LivePolicyAdminService } from '../services/live-policy-admin.service';
import type { PolicyOverviewView, PolicyVersionView } from '../types/live-policy-admin.types';

@UseGuards(PermissionGuard)
@RequirePermissions(Permission.ADMIN_LIVE_MANAGE)
@Controller('live/admin/policy')
export class LivePolicyAdminController {
  constructor(private readonly admin: LivePolicyAdminService) {}

  @Get()
  overview(): Promise<PolicyOverviewView> {
    return this.admin.overview();
  }

  @Put()
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(putPolicyBodySchema)) body: PutPolicyBody,
  ): Promise<PolicyVersionView> {
    return this.admin.publish(user.id, body.config, body.note);
  }

  @Post('rollback')
  rollback(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(rollbackPolicyBodySchema)) body: RollbackPolicyBody,
  ): Promise<PolicyVersionView> {
    return this.admin.rollback(user.id, body.version, body.note);
  }
}
