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
import { UserRole } from '@claw/shared-types';

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
  list(@CurrentUser() _user: AuthenticatedUser): Promise<SanitizedSearchProvider[]> {
    return this.service.list();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<SanitizedSearchProvider> {
    return this.service.getById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createSearchProviderSchema))
    dto: CreateSearchProviderDto,
  ): Promise<SanitizedSearchProvider> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSearchProviderSchema))
    dto: UpdateSearchProviderDto,
  ): Promise<SanitizedSearchProvider> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Post(':id/test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  test(@Param('id') id: string): Promise<ProviderHealthResult> {
    return this.service.testConnection(id);
  }
}
