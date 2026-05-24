import { Body, Controller, Post } from '@nestjs/common';
import { type RetrievalBundle, type RetrievalRequest } from '@claw/shared-types';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RecordUsageRequestDto,
  recordUsageRequestSchema,
  retrieveRequestSchema,
} from '../dto/retrieve.dto';
import { MemoryRetrievalService } from '../services/memory-retrieval.service';

@Controller('internal/memories')
export class MemoryRetrievalController {
  constructor(private readonly retrieval: MemoryRetrievalService) {}

  @Public()
  @Post('retrieve')
  async retrieve(
    @Body(new ZodValidationPipe(retrieveRequestSchema)) body: RetrievalRequest,
  ): Promise<RetrievalBundle> {
    return this.retrieval.retrieve(body);
  }

  @Public()
  @Post('record-usage')
  async recordUsage(
    @Body(new ZodValidationPipe(recordUsageRequestSchema)) body: RecordUsageRequestDto,
  ): Promise<{ recorded: number }> {
    const recorded = await this.retrieval.recordUsage(body.rows);
    return { recorded };
  }
}
