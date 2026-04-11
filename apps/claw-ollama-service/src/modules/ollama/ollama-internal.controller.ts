import { Controller, Get } from '@nestjs/common';
import { Public } from '../../app/decorators/public.decorator';
import { OllamaService } from './ollama.service';
import type { InstalledModelInfo } from './types/catalog.types';

@Controller('internal/ollama')
export class OllamaInternalController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Public()
  @Get('router-model')
  async getRouterModel(): Promise<{ model: string | null }> {
    const model = await this.ollamaService.getRouterModelName();
    return { model };
  }

  @Public()
  @Get('installed-models')
  async getInstalledModels(): Promise<InstalledModelInfo[]> {
    return this.ollamaService.getInstalledModelsWithDetails();
  }
}
