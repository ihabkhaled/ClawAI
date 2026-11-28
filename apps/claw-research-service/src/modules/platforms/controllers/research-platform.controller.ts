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
  type CreateResearchPlatformDto,
  createResearchPlatformSchema,
} from '../dto/create-research-platform.dto';
import {
  type TestResearchPlatformDto,
  testResearchPlatformSchema,
} from '../dto/test-research-platform.dto';
import {
  type UpdateResearchPlatformDto,
  updateResearchPlatformSchema,
} from '../dto/update-research-platform.dto';
import { ResearchPlatformService } from '../services/research-platform.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { ResearchPlatform } from '../../../generated/prisma';
import type { PlatformTestResult } from '../types/platform.types';

/**
 * Admin surface of the platform registry (research engine B3). Admin role plus
 * `RESEARCH_PROVIDERS_MANAGE` (the research providers page's permission) on
 * every route. Rows hold no secret.
 */
@Controller('research/platforms')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.RESEARCH_PROVIDERS_MANAGE)
export class ResearchPlatformController {
  constructor(private readonly service: ResearchPlatformService) {}

  @Get()
  list(): Promise<ResearchPlatform[]> {
    return this.service.list();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<ResearchPlatform> {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createResearchPlatformSchema)) dto: CreateResearchPlatformDto,
  ): Promise<ResearchPlatform> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateResearchPlatformSchema)) dto: UpdateResearchPlatformDto,
  ): Promise<ResearchPlatform> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  test(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(testResearchPlatformSchema)) dto: TestResearchPlatformDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformTestResult> {
    return this.service.test(id, dto, user.id);
  }
}
