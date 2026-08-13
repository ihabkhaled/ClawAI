import { Controller, Get } from '@nestjs/common';
import { type DeploymentStatusView, Permission } from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import { DeploymentService } from '../services/deployment.service';

@Controller('admin/deployment')
@Roles(UserRole.ADMIN)
export class DeploymentAdminController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Get()
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  get(@CurrentUser() actor: AuthenticatedUser): Promise<DeploymentStatusView> {
    return this.deploymentService.getStatus(actor.id);
  }
}
