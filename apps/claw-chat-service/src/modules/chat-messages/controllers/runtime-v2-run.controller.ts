import { Body, Controller, Post } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types';
import { type RuntimeStartDto, runtimeStartSchema } from '../dto/runtime-v2.dto';
import { RuntimeV2RunService } from '../services/runtime-v2-run.service';
import type { RuntimeV2StartAck } from '../types/runtime-v2-store.types';

@Controller('chat-messages/runtime/runs')
export class RuntimeV2RunController {
  constructor(private readonly runs: RuntimeV2RunService) {}

  @Post()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(runtimeStartSchema)) request: RuntimeStartDto,
  ): Promise<RuntimeV2StartAck> {
    return this.runs.start(user.id, request);
  }
}
