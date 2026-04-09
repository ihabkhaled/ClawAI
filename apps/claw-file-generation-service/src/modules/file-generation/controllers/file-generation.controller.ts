import { Controller, Get, MessageEvent, Param, Post, Query, Sse } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Public } from '../../../app/decorators/public.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FileGenerationService } from '../services/file-generation.service';
import { FileGenerationEventsService } from '../services/file-generation-events.service';
import {
  listFileGenerationsQuerySchema,
  type ListFileGenerationsQueryDto,
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

  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.retryGeneration(id);
    return { generationId: record.id, status: record.status };
  }

  @Public()
  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(id);
  }
}
