import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RepairOrphanGenerationsDto,
  repairOrphanGenerationsSchema,
} from '../dto/repair-orphan-generations.dto';
import { GenerationOrphanRepairService } from '../services/generation-orphan-repair.service';

@Controller('thread-publications-moderation/orphan-generations')
@RequirePermissions(Permission.THREAD_PUBLICATIONS_MODERATE)
export class PublicationGenerationRepairController {
  constructor(private readonly repair: GenerationOrphanRepairService) {}

  @Post('repair')
  @HttpCode(HttpStatus.OK)
  repairOrphans(
    @Body(new ZodValidationPipe(repairOrphanGenerationsSchema)) body: RepairOrphanGenerationsDto,
  ): ReturnType<GenerationOrphanRepairService['repair']> {
    return this.repair.repair(body);
  }
}
