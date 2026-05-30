import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission, type RuntimeProbeReport } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type RuntimeProbeQueryDto, RuntimeProbeQuerySchema } from '../dto/runtime-probe-query.dto';
import { LlamacppProbeService } from '../services/llamacpp-probe.service';

@Controller('runtime-progress')
export class RuntimeProgressController {
  constructor(private readonly probeService: LlamacppProbeService) {}

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Get('probe')
  @UsePipes(new ZodValidationPipe(RuntimeProbeQuerySchema))
  probe(@Query() _query: RuntimeProbeQueryDto): Promise<RuntimeProbeReport> {
    return this.probeService.probe();
  }
}
