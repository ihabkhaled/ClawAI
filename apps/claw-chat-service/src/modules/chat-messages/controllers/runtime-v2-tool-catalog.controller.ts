import { Body, Controller, Param, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type RuntimeDeferredToolLoadDto,
  runtimeDeferredToolLoadSchema,
} from '../dto/runtime-v2-deferred-tools.dto';
import {
  type RuntimeRunCommandQueryDto,
  runtimeRunCommandQuerySchema,
} from '../dto/runtime-v2.dto';
import { RuntimeV2ToolCatalogService } from '../services/runtime-v2-tool-catalog.service';
import type { RuntimeV2DeferredLoadAck } from '../types/runtime-v2-deferred-tools.types';

@Controller('chat-messages/runtime/runs/:runId')
export class RuntimeV2ToolCatalogController {
  constructor(private readonly catalog: RuntimeV2ToolCatalogService) {}

  @Post('tools')
  load(
    @Param('runId') runId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(runtimeRunCommandQuerySchema)) query: RuntimeRunCommandQueryDto,
    @Body(new ZodValidationPipe(runtimeDeferredToolLoadSchema)) command: RuntimeDeferredToolLoadDto,
  ): Promise<RuntimeV2DeferredLoadAck> {
    return this.catalog.load(user.id, query.threadId, runId, command);
  }
}
