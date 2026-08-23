import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import {
  type DeploymentCredentialClearResult,
  type DeploymentCredentialView,
  type DeploymentResetResult,
  type DeploymentRunProgress,
  type DeploymentStatusView,
  type DeploymentTriggerResult,
  Permission,
} from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type SaveDeploymentCredentialDto,
  saveDeploymentCredentialSchema,
} from '../dto/deployment-credential.dto';
import {
  type SetDeploymentAutomationDto,
  setDeploymentAutomationSchema,
  type TriggerDeploymentDto,
  triggerDeploymentSchema,
} from '../dto/deployment-trigger.dto';
import { DeploymentService } from '../services/deployment.service';
import { type DeploymentViewFlags } from '../types/deployment-view.types';

/**
 * Every route here is super-admin only: the service re-asserts that on the
 * actor rather than trusting the role decorator alone, because these endpoints
 * move production. The permission stays ADMIN_SYSTEM_VIEW — the super-admin
 * assertion, not the permission grant, is what gates deployment control.
 */
@Controller('admin/deployment')
@Roles(UserRole.ADMIN)
export class DeploymentAdminController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Get()
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  get(@CurrentUser() actor: AuthenticatedUser): Promise<DeploymentStatusView> {
    return this.deploymentService.getStatus(actor.id);
  }

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  trigger(
    @CurrentUser() actor: AuthenticatedUser,
    @Body(new ZodValidationPipe(triggerDeploymentSchema)) dto: TriggerDeploymentDto,
  ): Promise<DeploymentTriggerResult> {
    return this.deploymentService.trigger(actor.id, dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  reset(@CurrentUser() actor: AuthenticatedUser): Promise<DeploymentResetResult> {
    return this.deploymentService.reset(actor.id);
  }

  @Get('run')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  getRun(@CurrentUser() actor: AuthenticatedUser): Promise<DeploymentRunProgress> {
    return this.deploymentService.getRunProgress(actor.id);
  }

  @Put('credentials')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  saveCredentials(
    @CurrentUser() actor: AuthenticatedUser,
    @Body(new ZodValidationPipe(saveDeploymentCredentialSchema)) dto: SaveDeploymentCredentialDto,
  ): Promise<DeploymentCredentialView> {
    return this.deploymentService.saveCredentials(actor.id, dto);
  }

  @Delete('credentials')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  clearCredentials(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<DeploymentCredentialClearResult> {
    return this.deploymentService.clearCredentials(actor.id);
  }

  @Post('automation')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  setAutomation(
    @CurrentUser() actor: AuthenticatedUser,
    @Body(new ZodValidationPipe(setDeploymentAutomationSchema)) dto: SetDeploymentAutomationDto,
  ): Promise<DeploymentViewFlags> {
    return this.deploymentService.setAutomation(actor.id, dto);
  }
}
