import { Controller, Get, MessageEvent, Param, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FileGenerationService } from '../services/file-generation.service';
import { FileGenerationEventsService } from '../services/file-generation-events.service';
import { FileGenerationOwnerGuard } from '../guards/file-generation-owner.guard';
import {
  type ListFileGenerationsQueryDto,
  listFileGenerationsQuerySchema,
} from '../dto/generate-file.dto';

@Controller('file-generations')
export class FileGenerationController {
  constructor(
    private readonly fileGenService: FileGenerationService,
    private readonly eventsService: FileGenerationEventsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listFileGenerationsQuerySchema))
    query: ListFileGenerationsQueryDto,
  ): Promise<unknown> {
    return this.fileGenService.listByUser(user.id, query);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.fileGenService.getByIdForUser(id, user.id);
  }

  // Owner only: retry used to accept any id, so user A could re-run user B's job.
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.retryGenerationForUser(id, user.id);
    return { generationId: record.id, status: record.status };
  }

  // Owner only: this stream was public, so anyone holding an id could watch
  // the job's status and asset links. The guard refuses before a stream opens.
  @UseGuards(FileGenerationOwnerGuard)
  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(id);
  }
}
