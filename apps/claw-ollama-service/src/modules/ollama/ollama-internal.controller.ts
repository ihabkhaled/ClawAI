import { Controller, Get } from "@nestjs/common";
import { Public } from "../../app/decorators/public.decorator";
import { OllamaService } from "./ollama.service";

@Controller("internal/ollama")
export class OllamaInternalController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Public()
  @Get("router-model")
  async getRouterModel(): Promise<{ model: string | null }> {
    const model = await this.ollamaService.getRouterModelName();
    return { model };
  }
}
