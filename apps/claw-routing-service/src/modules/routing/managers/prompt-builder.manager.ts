import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { PROMPT_CACHE_TTL_MS, ROUTER_PROMPT_TEMPLATE } from '../constants/routing.constants';
import type {
  CachedPromptData,
  InstalledModelInfo,
  InstalledModelsResponse,
} from '../types/installed-model.types';

@Injectable()
export class PromptBuilderManager {
  private readonly logger = new Logger(PromptBuilderManager.name);
  private cachedPrompt: CachedPromptData | null = null;
  private cachedModels: InstalledModelInfo[] | null = null;

  async buildRouterPrompt(healthyProviders: string[]): Promise<string> {
    this.logger.debug('buildRouterPrompt: generating dynamic prompt');
    const models = await this.getInstalledModels();

    if (models.length === 0) {
      this.logger.debug('buildRouterPrompt: no installed models — using static template');
      return this.applyTemplateVariables(ROUTER_PROMPT_TEMPLATE, healthyProviders);
    }

    const cached = this.getCachedPrompt();
    if (cached) {
      this.logger.debug('buildRouterPrompt: using cached prompt');
      return this.applyTemplateVariables(cached, healthyProviders);
    }

    const dynamicPrompt = this.generateDynamicPrompt(models);
    this.setCachedPrompt(dynamicPrompt);
    return this.applyTemplateVariables(dynamicPrompt, healthyProviders);
  }

  async fetchInstalledModels(): Promise<InstalledModelInfo[]> {
    this.logger.debug('fetchInstalledModels: calling ollama-service');
    try {
      const config = AppConfig.get();
      const response = await httpRequest<InstalledModelsResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/internal/ollama/installed-models`,
        method: 'GET',
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        this.logger.warn(`fetchInstalledModels: failed with status ${String(response.status)}`);
        return [];
      }

      this.logger.debug(
        `fetchInstalledModels: received ${String(response.data.models.length)} models`,
      );
      return response.data.models;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchInstalledModels: error — ${msg}`);
      return [];
    }
  }

  invalidateCache(): void {
    this.logger.log('invalidateCache: clearing prompt and model caches');
    this.cachedPrompt = null;
    this.cachedModels = null;
  }

  private async getInstalledModels(): Promise<InstalledModelInfo[]> {
    if (this.cachedModels) {
      this.logger.debug('getInstalledModels: using cached models');
      return this.cachedModels;
    }

    const models = await this.fetchInstalledModels();
    this.cachedModels = models;
    return models;
  }

  private getCachedPrompt(): string | null {
    if (!this.cachedPrompt) {
      return null;
    }

    const elapsed = Date.now() - this.cachedPrompt.generatedAt;
    if (elapsed > PROMPT_CACHE_TTL_MS) {
      this.logger.debug('getCachedPrompt: cache expired');
      this.cachedPrompt = null;
      return null;
    }

    return this.cachedPrompt.prompt;
  }

  private setCachedPrompt(prompt: string): void {
    this.cachedPrompt = { prompt, generatedAt: Date.now() };
    this.logger.debug('setCachedPrompt: prompt cached');
  }

  private generateDynamicPrompt(models: InstalledModelInfo[]): string {
    this.logger.debug(`generateDynamicPrompt: building from ${String(models.length)} models`);
    const grouped = this.groupModelsByCategory(models);
    const localSection = this.buildLocalModelsSection(grouped);
    return this.buildFullPromptTemplate(localSection);
  }

  private groupModelsByCategory(models: InstalledModelInfo[]): Map<string, InstalledModelInfo[]> {
    const groups = new Map<string, InstalledModelInfo[]>();

    for (const model of models) {
      const category = model.category || 'general';
      const existing = groups.get(category) ?? [];
      existing.push(model);
      groups.set(category, existing);
    }

    return groups;
  }

  private buildLocalModelsSection(grouped: Map<string, InstalledModelInfo[]>): string {
    const lines: string[] = ['LOCAL MODELS (free, private, no internet needed):'];

    for (const [category, models] of grouped) {
      lines.push(`  [${category}]`);
      for (const model of models) {
        const roles = model.roles.length > 0 ? ` (roles: ${model.roles.join(', ')})` : '';
        const params = model.parameterCount ? `, ${model.parameterCount} params` : '';
        lines.push(`  - local-ollama / ${model.name}:${model.tag}${params}${roles}`);
      }
    }

    return lines.join('\n');
  }

  private buildFullPromptTemplate(localSection: string): string {
    return `You are an intelligent AI routing engine. Analyze the user message and decide which AI provider and model is best suited to answer it.

Available providers and models:

${localSection}

CLOUD MODELS (paid, internet required, higher quality):
- OPENAI / gpt-4o-mini (fast, general purpose, good for summarization, chat, writing)
- ANTHROPIC / claude-sonnet-4 (excellent coding, debugging, code review, technical analysis)
- ANTHROPIC / claude-opus-4 (best for deep reasoning, complex analysis, architecture decisions)
- GEMINI / gemini-2.5-flash (fast, multimodal, best for image/video, web search, YouTube, file analysis)
- DEEPSEEK / deepseek-chat (strong coding and math, very low cost)

IMAGE GENERATION MODELS (generate images from text prompts):
- IMAGE_OPENAI / dall-e-3 (best quality, photorealistic images, DALL-E 3)
- IMAGE_GEMINI / gemini-2.5-flash-image (Google Gemini 2.5 image generation)
- IMAGE_LOCAL / sdxl-turbo (local Stable Diffusion, free, no internet, lower quality)

Healthy providers: {healthyProviders}

ROUTING RULES (follow strictly, in priority order):

IMAGE GENERATION (highest priority — detect these first):
- Any request to generate, create, draw, make, paint, render, design an image/picture/photo/portrait/illustration/sketch/art/logo/poster → IMAGE_GEMINI / gemini-2.5-flash-image
- "generate similar to this", "recreate this image", "make one like this" → IMAGE_GEMINI / gemini-2.5-flash-image

FILE GENERATION:
- Create/generate/export/save a file/document/PDF/CSV/DOCX/report → FILE_GENERATION / auto

TEXT TASKS:
- Coding, debugging, code review, refactoring → ANTHROPIC / claude-sonnet-4 (or local coding model if available)
- Complex reasoning, architecture, system design → ANTHROPIC / claude-opus-4 (or local reasoning model if available)
- Research, deep analysis, investigation → local thinking model if available, else GEMINI / gemini-2.5-flash
- Image analysis, vision, describing attached images → GEMINI / gemini-2.5-flash
- Math, algorithms, competitive programming → DEEPSEEK / deepseek-chat or local reasoning model
- Creative writing, storytelling, marketing copy → OPENAI / gpt-4o-mini
- Simple greetings, translations, quick facts → local-ollama / default chat model
- General chat, summarization, email drafting → local-ollama / default or OPENAI / gpt-4o-mini
- Data analysis, CSV/JSON/file parsing → GEMINI / gemini-2.5-flash
- Privacy-sensitive requests → local-ollama (never send to cloud)

GENERAL RULES:
- ONLY route to healthy providers listed above
- Prefer local models when quality is acceptable for the task
- Use category-specific local models when available (coding model for code, reasoning model for math/logic)
- If unsure or ambiguous → GEMINI / gemini-2.5-flash (best general purpose)

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;
  }

  private applyTemplateVariables(template: string, healthyProviders: string[]): string {
    return template.replace(
      '{healthyProviders}',
      healthyProviders.join(', ') || 'all (no health data)',
    );
  }
}
