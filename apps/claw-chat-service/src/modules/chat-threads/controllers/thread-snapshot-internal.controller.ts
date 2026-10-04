import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ThreadSnapshotRequestDto,
  threadSnapshotRequestSchema,
} from '../dto/thread-snapshot.dto';
import { ThreadSnapshotService } from '../services/thread-snapshot.service';
import type { ThreadSnapshot } from '../types/thread-snapshot.types';

@Controller('internal/thread-snapshots')
@Public()
@UseGuards(ServiceTokenGuard)
export class ThreadSnapshotInternalController {
  constructor(private readonly snapshots: ThreadSnapshotService) {}

  @Post(':threadId')
  async create(
    @Param('threadId') threadId: string,
    @Body(new ZodValidationPipe(threadSnapshotRequestSchema)) body: ThreadSnapshotRequestDto,
  ): Promise<ThreadSnapshot> {
    return this.snapshots.create(body.userId, threadId);
  }
}
