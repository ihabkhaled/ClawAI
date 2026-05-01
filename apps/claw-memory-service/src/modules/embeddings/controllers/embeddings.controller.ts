import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { EmbeddingsService } from '../services/embeddings.service';
import type {
  SearchResponse,
  SearchWorkspaceObjectsInput,
  UpsertWorkspaceObjectEmbeddingInput,
} from '../types/embeddings.types';

@Controller('internal/embeddings')
export class EmbeddingsController {
  constructor(private readonly service: EmbeddingsService) {}

  /**
   * Stream 30 — service-to-service upsert. Called by claw-workspace-service
   * after every workspace object create/update. Idempotent on (objectId, contentHash).
   */
  @Public()
  @Post('upsert-workspace-object')
  @HttpCode(HttpStatus.CREATED)
  async upsert(
    @Body() body: UpsertWorkspaceObjectEmbeddingInput,
  ): Promise<{ created: boolean }> {
    return this.service.upsert(body);
  }

  @Public()
  @Post('search-workspace-objects')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: SearchWorkspaceObjectsInput): Promise<SearchResponse> {
    return this.service.search(body);
  }

  @Public()
  @Post('delete-by-object-id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteByObjectId(@Body() body: { workspaceObjectId: string }): Promise<void> {
    await this.service.deleteByObjectId(body.workspaceObjectId);
  }
}
