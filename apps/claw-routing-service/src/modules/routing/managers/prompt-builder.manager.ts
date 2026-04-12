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

CAPABILITY CLASSES (33 categories — detect in this priority order):

PRIVACY-SENSITIVE (MUST route to local-ollama — NEVER send to cloud):
1. Privacy — personal data, PII, SSN, credit cards, passwords, secrets, confidential info
2. Medical — clinical, patient, diagnosis, HIPAA, PHI, medication, health records
3. Legal — contracts, NDA, compliance, GDPR, litigation, attorney-client privilege
4. Finance — P&L, balance sheet, tax, portfolio, banking, credit, investment data
5. Executive — board meetings, M&A, acquisitions, IPO, corporate governance, earnings
6. Government — classified, intelligence, national security, defense, clearance, SIGINT

SPECIALIZED ROUTING (use category-specific models when available):
7. Coding — code, debug, refactor, APIs, testing, Git, frameworks → LOCAL_CODING or ANTHROPIC
8. Infrastructure — Terraform, Kubernetes, Docker, AWS, CI/CD, DevOps → LOCAL_CODING or ANTHROPIC
9. Security — vulnerabilities, penetration testing, OWASP, threat hunting, forensics → LOCAL_CODING
10. Data Analysis — datasets, ML, AI, NLP, statistics, visualization, ETL → LOCAL_REASONING or GEMINI
11. Reasoning — proofs, theorems, math, logic, step-by-step analysis → LOCAL_REASONING or ANTHROPIC
12. Research — literature review, methodology, surveys, academic papers → LOCAL_REASONING or GEMINI
13. Engineering — CAD, FEA, CFD, circuit design, manufacturing, automotive → LOCAL_REASONING
14. Science — chemistry, biology, physics, quantum mechanics, climate → LOCAL_REASONING
15. Real Estate — property, mortgage, appraisal, zoning, cap rate → LOCAL_REASONING
16. Thinking — deep research, compare-and-contrast, investigation, trade-offs → LOCAL_THINKING or GEMINI

FILE & IMAGE GENERATION:
17. Image Generation — generate/create/draw images, photos, art, logos → IMAGE_GEMINI or IMAGE_OPENAI
18. File Generation — create/export PDF, CSV, DOCX, reports, documents → FILE_GENERATION / auto

BUSINESS & OPERATIONS (route to file generation or chat models):
19. Business — KPIs, ROI, campaigns, market analysis, pitch decks → LOCAL_FILE_GENERATION or OPENAI
20. Operations — supply chain, lean, six sigma, SOP, procurement → LOCAL_FILE_GENERATION
21. HR — job descriptions, onboarding, performance reviews, talent → LOCAL_FALLBACK_CHAT
22. Sales — demos, POC, churn, battle cards, competitive positioning → LOCAL_FALLBACK_CHAT
23. Customer Support — helpdesk, tickets, knowledge base, SLA → LOCAL_FALLBACK_CHAT

CONTENT & COMMUNICATION:
24. Creative Writing — blog posts, articles, poems, scripts, copywriting → LOCAL_FALLBACK_CHAT or OPENAI
25. Translation — translate, localize, i18n, multilingual → LOCAL_FALLBACK_CHAT
26. Video/Audio — video scripts, storyboards, editing, voiceover → LOCAL_FALLBACK_CHAT
27. Design — wireframes, mockups, Figma, design systems, UI/UX → LOCAL_FALLBACK_CHAT
28. Media — journalism, editorial, publishing, broadcasting, ad tech → LOCAL_FALLBACK_CHAT
29. Education — curriculum, lesson plans, pedagogy, LMS, assessments → LOCAL_FALLBACK_CHAT

DOMAIN-SPECIFIC:
30. Logistics — freight, shipping, warehouse management, fleet, customs → LOCAL_FALLBACK_CHAT
31. Hospitality — hotel revenue, restaurant ops, event planning, tourism → LOCAL_FALLBACK_CHAT
32. Sustainability — ESG, carbon emissions, green building, circular economy → LOCAL_FALLBACK_CHAT
33. General Chat — greetings, small talk, quick facts, simple questions → LOCAL_FALLBACK_CHAT

ROUTING RULES (follow strictly, in priority order):

1. IMAGE GENERATION (highest priority — detect these first):
   - Any request to generate, create, draw, make, paint, render, design an image → IMAGE_GEMINI / gemini-2.5-flash-image
   - Art style keywords (photorealistic, watercolor, pixel art, etc.) → IMAGE_GEMINI / gemini-2.5-flash-image

2. FILE GENERATION:
   - Create/generate/export/save a file/document/PDF/CSV/DOCX/report → FILE_GENERATION / auto

3. PRIVACY-SENSITIVE (categories 1-6 above):
   - ALWAYS route to local-ollama — NEVER send to cloud providers
   - Medical, legal, financial, executive, and government content is inherently private

4. CATEGORY-SPECIFIC (categories 7-16 above):
   - Use the best matching local model role if installed
   - Fall back to cloud if no local model available

5. GENERAL TEXT TASKS:
   - Coding, debugging, code review → ANTHROPIC / claude-sonnet-4
   - Complex reasoning, architecture → ANTHROPIC / claude-opus-4
   - Math, algorithms → DEEPSEEK / deepseek-chat or local reasoning
   - Creative writing, marketing copy → OPENAI / gpt-4o-mini
   - Simple greetings, translations → local-ollama / default
   - Data analysis, file parsing → GEMINI / gemini-2.5-flash

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
