import { Controller, Get, Post, Body } from "@nestjs/common";
import { OllamaService } from "./ollama.service";
import {
  GenerateRequest,
  GenerateResponse,
  OllamaModelsResponse,
  OllamaStatusResponse,
  PullModelRequest,
  PullModelResponse,
} from "./ollama.types";

@Controller("ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get("models")
  async listModels(): Promise<OllamaModelsResponse> {
    return this.ollamaService.listModels();
  }

  @Post("generate")
  async generate(@Body() body: GenerateRequest): Promise<GenerateResponse> {
    return this.ollamaService.generate(body);
  }

  @Post("pull")
  async pullModel(@Body() body: PullModelRequest): Promise<PullModelResponse> {
    return this.ollamaService.pullModel(body);
  }

  @Get("status")
  async status(): Promise<OllamaStatusResponse> {
    return this.ollamaService.checkStatus();
  }
}
