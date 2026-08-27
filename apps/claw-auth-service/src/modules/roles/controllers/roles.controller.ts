import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto, createRoleSchema } from '../dto/create-role.dto';
import { UpdateRoleDto, updateRoleSchema } from '../dto/update-role.dto';
import { SetPermissionsDto, setPermissionsSchema } from '../dto/set-permissions.dto';
import { type RoleWithPermissions } from '../types/roles.types';

@Controller('admin/roles')
@Roles(UserRole.ADMIN)
// The whole role/permission matrix was gated on the ADMIN role enum alone, with
// no permission requirement on any route — so any administrator could edit the
// grant set that defines what every administrator can do.
@RequirePermissions(Permission.ADMIN_PERMISSIONS_MANAGE)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  getPermissionCatalog(): { permissions: Permission[] } {
    return { permissions: Object.values(Permission) };
  }

  @Get()
  async list(): Promise<RoleWithPermissions[]> {
    return this.rolesService.listRoles();
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<RoleWithPermissions> {
    return this.rolesService.getRole(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createRoleSchema)) dto: CreateRoleDto,
  ): Promise<RoleWithPermissions> {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) dto: UpdateRoleDto,
  ): Promise<RoleWithPermissions> {
    return this.rolesService.updateRole(id, dto);
  }

  @Put(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setPermissionsSchema)) dto: SetPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return this.rolesService.setPermissions(id, dto.permissions, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.deleteRole(id);
  }
}
