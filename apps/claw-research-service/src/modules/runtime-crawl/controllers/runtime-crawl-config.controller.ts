import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, Roles } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission, UserRole } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type UpdateRuntimeCrawlConfigDto,
  updateRuntimeCrawlConfigSchema,
} from '../dto/update-runtime-crawl-config.dto';
import { RuntimeCrawlConfigService } from '../services/runtime-crawl-config.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { RuntimeCrawlConfigView } from '../types/runtime-crawl.types';

/**
 * Admin-only: the DB-level limits of the runtime crawl. Editing them is the
 * kill switch (`enabled: false`) and the cost lever, with no deploy.
 */
@Controller('research/runtime-crawl/config')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
export class RuntimeCrawlConfigController {
  constructor(private readonly service: RuntimeCrawlConfigService) {}

  @Get()
  get(): Promise<RuntimeCrawlConfigView> {
    return this.service.get();
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateRuntimeCrawlConfigSchema)) dto: UpdateRuntimeCrawlConfigDto,
  ): Promise<RuntimeCrawlConfigView> {
    return this.service.update(dto, user.id);
  }
}
