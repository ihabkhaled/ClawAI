import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RuntimeAdmissionDto,
  type RuntimeAdmissionReleaseDto,
  runtimeAdmissionReleaseSchema,
  runtimeAdmissionSchema,
} from '../dto/runtime-admission.dto';
import { RuntimeAdmissionService } from '../services/runtime-admission.service';
import type { RuntimeAdmissionAck } from '../types/runtime-admission.types';

@Controller('internal/runtime/admissions')
@Public()
@UseGuards(ServiceTokenGuard)
export class RuntimeAdmissionInternalController {
  constructor(private readonly admissions: RuntimeAdmissionService) {}

  @Post()
  reserve(
    @Body(new ZodValidationPipe(runtimeAdmissionSchema)) input: RuntimeAdmissionDto,
  ): Promise<RuntimeAdmissionAck> {
    return this.admissions.reserve(input);
  }

  @Post('release')
  async release(
    @Body(new ZodValidationPipe(runtimeAdmissionReleaseSchema)) input: RuntimeAdmissionReleaseDto,
  ): Promise<{ released: true }> {
    await this.admissions.release(input);
    return { released: true };
  }
}
