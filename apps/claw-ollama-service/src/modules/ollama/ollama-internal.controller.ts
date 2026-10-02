import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../app/guards/service-token.guard';
import { RoutingSnapshotManager } from './managers/routing-snapshot.manager';
import { OllamaService } from './ollama.service';
import type { InstalledModelsApiResponse, RoutingSnapshotResponse } from './types/catalog.types';

// `@Public()` only skips the USER JWT guard — a service has no user token.
// `ServiceTokenGuard` is what actually authenticates every route here (ADR-144).
@Controller('internal/ollama')
@UseGuards(ServiceTokenGuard)
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
