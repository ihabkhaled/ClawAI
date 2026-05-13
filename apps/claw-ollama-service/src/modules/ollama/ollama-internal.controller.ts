import { Controller, Get } from '@nestjs/common';
import { Public } from '../../app/decorators/public.decorator';
import { RoutingSnapshotManager } from './managers/routing-snapshot.manager';
import { OllamaService } from './ollama.service';
import type { InstalledModelsApiResponse, RoutingSnapshotResponse } from './types/catalog.types';

@Controller('internal/ollama')
export class OllamaInternalController {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly routingSnapshotManager: RoutingSnapshotManager,
  ) {}

  @Public()
  @Get('router-model')
  async getRouterModel(): Promise<{ model: string | null }> {
    const model = await this.ollamaService.getRouterModelName();
    return { model };
  }

  @Public()
  @Get('installed-models')
  async getInstalledModels(): Promise<InstalledModelsApiResponse> {
    const models = await this.ollamaService.getInstalledModelsWithDetails();
    return { models };
  }

  @Public()
  @Get('installed-snapshot')
  async getInstalledSnapshot(): Promise<RoutingSnapshotResponse> {
    return this.routingSnapshotManager.build();
  }
}
