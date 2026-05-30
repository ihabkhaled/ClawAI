import { Controller, Get, Query } from '@nestjs/common';
import { type RuntimeProbeReport } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums/user-role.enum';
import { type RuntimeProbeQueryDto, runtimeProbeQuerySchema } from '../dto/runtime-probe-query.dto';
import { OllamaProbeService } from '../services/ollama-probe.service';

@Controller('runtime-progress')
export class RuntimeProgressController {
  constructor(private readonly ollamaProbeService: OllamaProbeService) {}

  @Get('probe')
  @Roles(UserRole.ADMIN)
  probe(
    @Query(new ZodValidationPipe(runtimeProbeQuerySchema)) query: RuntimeProbeQueryDto,
  ): Promise<RuntimeProbeReport> {
    return this.ollamaProbeService.probe(query);
  }
}
