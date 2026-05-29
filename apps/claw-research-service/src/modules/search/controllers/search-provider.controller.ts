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
} from '@nestjs/common';
import { CurrentUser, Roles } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateSearchProviderDto,
  createSearchProviderSchema,
} from '../dto/create-search-provider.dto';
import {
  type UpdateSearchProviderDto,
  updateSearchProviderSchema,
} from '../dto/update-search-provider.dto';
import { SearchProviderService } from '../services/search-provider.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { SanitizedSearchProvider } from '../types/sanitized-search-provider.types';
import type { ProviderHealthResult } from '../types/search.types';

@Controller('research/search-providers')
export class SearchProviderController {
  constructor(private readonly service: SearchProviderService) {}

  @Get()
  @RequirePermissions(Permission.RESEARCH_USE)
  list(@CurrentUser() _user: AuthenticatedUser): Promise<SanitizedSearchProvider[]> {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions(Permission.RESEARCH_USE)
  getOne(@Param('id') id: string): Promise<SanitizedSearchProvider> {
    return this.service.getById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createSearchProviderSchema))
    dto: CreateSearchProviderDto,
  ): Promise<SanitizedSearchProvider> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSearchProviderSchema))
    dto: UpdateSearchProviderDto,
  ): Promise<SanitizedSearchProvider> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Post(':id/test')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  @HttpCode(HttpStatus.OK)
  test(@Param('id') id: string): Promise<ProviderHealthResult> {
    return this.service.testConnection(id);
  }
}
