import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { FULL_ROUTER_PROMPT_TEMPLATE } from '../constants/prompt-templates.constants';
import { PROMPT_CACHE_TTL_MS, ROUTER_PROMPT_TEMPLATE } from '../constants/routing.constants';
import { AdaptiveLearningManager } from './adaptive-learning.manager';
import { RouterEducationManager } from './router-education.manager';
import type { AdaptiveLearningInsights, ProviderInsight } from '../types/adaptive-learning.types';
import type {
  CachedInsightsData,
  CachedPromptData,
  InstalledModelInfo,
  InstalledModelsResponse,
  RouterRoutingSignals,
} from '../types/installed-model.types';
import type { RoutingEducationSnapshot } from '../types/routing-education.types';

@Injectable()
export class PromptBuilderManager {
  private readonly logger = new Logger(PromptBuilderManager.name);
  private cachedPrompt: CachedPromptData | null = null;
  private cachedModels: InstalledModelInfo[] | null = null;
  private cachedInsights: CachedInsightsData | null = null;

  constructor(
    private readonly adaptiveLearningManager?: AdaptiveLearningManager,
    private readonly routerEducationManager?: RouterEducationManager,
  ) {}

  async buildRouterPrompt(
    healthyProviders: string[],
    routingSignals?: RouterRoutingSignals,
  ): Promise<string> {
    this.logger.debug('buildRouterPrompt: generating dynamic prompt');
    const models = await this.getInstalledModels();
    const insights = await this.getAdaptiveInsights();
    const educationSnapshot = await this.getRouterEducationSnapshot();
    const priorsSection = this.buildLearnedRoutingPriorsSection(insights);
    const educationSection = this.buildRouterEducationSection(educationSnapshot);
    const connectorPriorsSection = this.buildConnectorPriorsSection(
      healthyProviders,
      routingSignals,
      insights,
    );

    if (models.length === 0) {
      this.logger.debug('buildRouterPrompt: no installed models - using static template');
      return this.appendRoutingContext(
        this.applyTemplateVariables(ROUTER_PROMPT_TEMPLATE, healthyProviders),
        models,
        priorsSection,
        educationSection,
        connectorPriorsSection,
        routingSignals,
      );
    }

    const cached = this.getCachedPrompt();
    if (cached) {
      this.logger.debug('buildRouterPrompt: using cached prompt');
      return this.appendRoutingContext(
        this.applyTemplateVariables(cached, healthyProviders),
        models,
        priorsSection,
        educationSection,
        connectorPriorsSection,
        routingSignals,
      );
    }

    const dynamicPrompt = this.generateDynamicPrompt(models);
    this.setCachedPrompt(dynamicPrompt);
    return this.appendRoutingContext(
      this.applyTemplateVariables(dynamicPrompt, healthyProviders),
      models,
      priorsSection,
      educationSection,
      connectorPriorsSection,
      routingSignals,
    );
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
      this.logger.warn(`fetchInstalledModels: error - ${msg}`);
      return [];
    }
  }

  invalidateCache(): void {
    this.logger.log('invalidateCache: clearing prompt and model caches');
    this.cachedPrompt = null;
    this.cachedModels = null;
    this.cachedInsights = null;
  }

  async getInstalledModels(): Promise<InstalledModelInfo[]> {
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
    const filteredModels = this.filterRouterOnlyModels(models);
    this.logger.debug(
      `generateDynamicPrompt: building from ${String(filteredModels.length)} response models (filtered from ${String(models.length)})`,
    );
    const grouped = this.groupModelsByCategory(filteredModels);
    const localSection = this.buildLocalModelsSection(grouped);
    const useCompactPrompt = AppConfig.get().ROUTER_COMPACT_PROMPT;
    return useCompactPrompt
      ? this.buildCompactPromptTemplate(localSection)
      : this.buildFullPromptTemplate(localSection);
  }

  private filterRouterOnlyModels(models: InstalledModelInfo[]): InstalledModelInfo[] {
    return models.filter((model) => !model.roles.includes('ROUTER'));
  }

  private groupModelsByCategory(models: InstalledModelInfo[]): Map<string, InstalledModelInfo[]> {
    const groups = new Map<string, InstalledModelInfo[]>();

    for (const model of models) {
      const category = model.category ?? 'general';
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

  private buildCompactPromptTemplate(localSection: string): string {
    return `You are a routing engine. Pick the best provider and model for the user message.
Return only valid JSON. Do not answer the user.

Available local response models:
${localSection}

Cloud and special providers:
- GEMINI / gemini-2.5-flash: fast general cloud, multimodal, file reading, vision
- ANTHROPIC / claude-sonnet-4: coding, debugging, technical work
- ANTHROPIC / claude-opus-4: complex reasoning and architecture
- OPENAI / gpt-4o-mini: quick general text
- IMAGE_GEMINI / gemini-2.5-flash-image: image creation
- IMAGE_LOCAL / sdxl-turbo: local image creation
- FILE_GENERATION / auto: file, PDF, DOCX, CSV, or export creation

Healthy providers: {healthyProviders}

Rules:
- Never choose qwen3:1.7b as the response model; it is router-only.
- Use only providers listed in Healthy providers.
- Private, medical, legal, finance, secrets, or internal business data must stay local-ollama.
- Image creation uses IMAGE_GEMINI / gemini-2.5-flash-image.
- File creation uses FILE_GENERATION / auto.
- Coding uses ANTHROPIC / claude-sonnet-4 if healthy, otherwise local-ollama / AUTO.
- Simple chat, summaries, translation, and private work use local-ollama / AUTO.
- Always return model "AUTO" when provider is local-ollama; do not choose a specific local response model.
- Return exactly this JSON shape: {"provider":"...","model":"...","confidence":0.0,"reason":"..."}

User message: {message}`;
  }

  private buildFullPromptTemplate(localSection: string): string {
    return FULL_ROUTER_PROMPT_TEMPLATE.replace('{localSection}', localSection);
  }

  private applyTemplateVariables(template: string, healthyProviders: string[]): string {
    return template.replace(
      '{healthyProviders}',
      healthyProviders.join(', ') || 'all (no health data)',
    );
  }

  private appendRoutingContext(
    prompt: string,
    models: InstalledModelInfo[],
    priorsSection: string,
    educationSection: string,
    connectorPriorsSection: string,
    routingSignals?: RouterRoutingSignals,
  ): string {
    const intelligenceSection = this.buildModelIntelligenceSection(
      this.filterRouterOnlyModels(models),
    );
    const examplesSection = this.buildTrainingExamplesSection();
    const signalsSection = this.buildRoutingSignalsSection(routingSignals);
    return [
      prompt.trim(),
      intelligenceSection,
      examplesSection,
      priorsSection,
      educationSection,
      connectorPriorsSection,
      signalsSection,
    ].join('\n\n');
  }

  private buildModelIntelligenceSection(models: InstalledModelInfo[]): string {
    const lines: string[] = ['MODEL INTELLIGENCE (use this to pick the best execution target):'];

    if (models.length === 0) {
      lines.push(
        '- No local execution models detected.',
        '- If no healthy execution model exists, return {"provider":"ERROR","model":"ERROR","confidence":0,"reason":"No execution model available"}.',
      );
      return lines.join('\n');
    }

    const roleMap = new Map<string, InstalledModelInfo[]>();
    for (const model of models) {
      const roles = model.roles.length > 0 ? model.roles : ['LOCAL_FALLBACK_CHAT'];
      const capabilities =
        model.capabilities.length > 0 ? model.capabilities.join(', ') : 'unknown';
      const inferredCapabilities = this.inferCapabilities(model, roles);
      const sizeBand = this.classifySizeBand(model.sizeBytes ?? null);
      lines.push(
        `- ${model.name}:${model.tag} | category=${model.category ?? 'general'} | roles=${roles.join(', ')} | capabilities=${capabilities} | inferred=${inferredCapabilities.join(', ') || 'none'} | size=${sizeBand} | params=${model.parameterCount ?? 'unknown'}`,
      );

      for (const role of roles) {
        const existing = roleMap.get(role) ?? [];
        existing.push(model);
        roleMap.set(role, existing);
      }
    }

    lines.push('ROLE TO MODEL HINTS:');
    for (const [role, roleModels] of roleMap) {
      lines.push(
        `- ${role}: ${roleModels.map((model) => `${model.name}:${model.tag}`).join(' > ')}`,
      );
    }

    return lines.join('\n');
  }

  private buildTrainingExamplesSection(): string {
    return [
      'ROUTER TRAINING EXAMPLES (follow the pattern, do not answer the user):',
      '- "Write a TypeScript retry service with tests" -> ANTHROPIC / claude-sonnet-4, reason: coding and testing work.',
      '- "Create a PDF brief for this summary" -> FILE_GENERATION / auto, reason: explicit file output request.',
      '- "Generate a photorealistic poster of a night market" -> IMAGE_GEMINI / gemini-2.5-flash-image, reason: image generation request.',
      '- "Review this NDA for risk" -> local-ollama / AUTO, reason: privacy-sensitive legal content must stay local.',
      '- "Rewrite this HIPAA policy for employees in plain English" -> local-ollama / AUTO, reason: compliance-sensitive rewrite must stay private and factual.',
      '- "Compare these quarterly revenue scenarios and recommend the safest option" -> local-ollama / AUTO or ANTHROPIC / claude-opus-4, reason: executive analysis with risk trade-offs.',
      '- "Draft a concise sales follow-up email from these notes" -> OPENAI / gpt-4o-mini or local-ollama / AUTO, reason: short commercial writing should stay lightweight.',
      '- "Translate this short note into Arabic" -> local-ollama / AUTO, reason: simple language task should stay cheap and private.',
      '- "Turn this incident summary into a board-ready update" -> local-ollama / AUTO, reason: executive rewrite should preserve facts before polishing tone.',
      '- "Analyze the CSV and summarize outliers" -> GEMINI / gemini-2.5-flash or LOCAL_REASONING if installed, reason: data parsing and structured analysis.',
      '- Never emit prose in the route response. Only emit JSON.',
    ].join('\n');
  }

  private buildLearnedRoutingPriorsSection(insights: AdaptiveLearningInsights | null): string {
    const lines: string[] = ['LEARNED ROUTING PRIORS (from recent routing decisions):'];

    if (!insights) {
      lines.push('- No routing history available yet.');
      return lines.join('\n');
    }

    lines.push(
      `- windowDays=${insights.windowDays} totalDecisions=${insights.totalDecisions}`,
      `- avgConfidence=${insights.avgConfidence.toFixed(2)}`,
    );

    if (insights.providerInsights.length > 0) {
      for (const provider of insights.providerInsights.slice(0, 6)) {
        const topModes = provider.topModes.length > 0 ? provider.topModes.join(', ') : 'n/a';
        const learnedWeight = this.computeProviderLearnedWeight(
          provider.avgConfidence,
          provider.fallbackRate,
        );
        lines.push(
          `- ${provider.provider}: total=${provider.totalDecisions} fallbackRate=${provider.fallbackRate.toFixed(2)} avgConfidence=${provider.avgConfidence.toFixed(2)} weight=${learnedWeight.toFixed(2)} topModes=${topModes}`,
        );
      }
    } else {
      lines.push('- providerInsights: unavailable');
    }

    if (insights.modeInsights.length > 0) {
      lines.push(
        `- modeInsights: ${insights.modeInsights
          .slice(0, 6)
          .map(
            (mode) => `${mode.routingMode}: ${mode.count} (${Math.round(mode.percentage * 100)}%)`,
          )
          .join(' | ')}`,
      );
    } else {
      lines.push('- modeInsights: unavailable');
    }

    if (insights.topReasonTags.length > 0) {
      lines.push(`- topTags=${insights.topReasonTags.join(', ')}`);
    }

    lines.push(
      '- Prefer providers with lower fallback rate and stronger average confidence for the same task class.',
    );

    return lines.join('\n');
  }

  private buildConnectorPriorsSection(
    healthyProviders: string[],
    routingSignals?: RouterRoutingSignals,
    insights?: AdaptiveLearningInsights | null,
  ): string {
    const lines: string[] = ['CONNECTOR PRIORS (current health + learned fit):'];
    const healthySet = new Set(healthyProviders);
    const providerInsights = new Map(
      insights?.providerInsights.map((provider) => [provider.provider, provider]) ?? [],
    );
    const latencyMap = this.toRecordMap<number>(routingSignals?.providerLatencyMs);
    const circuitMap = this.toRecordMap<number>(routingSignals?.providerCircuitOpenUntil);
    const now = Date.now();

    const providerNames = new Set<string>([
      ...healthyProviders,
      ...latencyMap.keys(),
      ...circuitMap.keys(),
      ...providerInsights.keys(),
    ]);

    if (providerNames.size === 0) {
      lines.push('- No connector priors available yet.');
      return lines.join('\n');
    }

    const ranked = this.rankConnectorProviders(providerNames, providerInsights);
    for (const provider of ranked.slice(0, 10)) {
      lines.push(
        this.formatConnectorPriorRow(
          provider,
          healthySet,
          providerInsights,
          latencyMap,
          circuitMap,
          now,
        ),
      );
    }

    lines.push(
      '- Prefer healthy connectors with the highest weight when several routes are valid.',
    );
    return lines.join('\n');
  }

  private toRecordMap<V>(record: Record<string, V> | undefined): Map<string, V> {
    return new Map<string, V>(Object.entries(record ?? {}));
  }

  private rankConnectorProviders(
    providerNames: Set<string>,
    providerInsights: Map<string, ProviderInsight>,
  ): string[] {
    return [...providerNames].sort((a, b) => {
      const aWeight = this.weightFromInsight(providerInsights.get(a));
      const bWeight = this.weightFromInsight(providerInsights.get(b));
      return bWeight - aWeight || a.localeCompare(b);
    });
  }

  private weightFromInsight(insight: ProviderInsight | undefined): number {
    return insight
      ? this.computeProviderLearnedWeight(insight.avgConfidence, insight.fallbackRate)
      : -1;
  }

  private formatConnectorPriorRow(
    provider: string,
    healthySet: Set<string>,
    providerInsights: Map<string, ProviderInsight>,
    latencyMap: Map<string, number>,
    circuitMap: Map<string, number>,
    now: number,
  ): string {
    const insight = providerInsights.get(provider);
    const circuitOpenUntil = circuitMap.get(provider);
    const latency = latencyMap.get(provider);
    const status = this.computeConnectorStatus(provider, healthySet, circuitOpenUntil, now);
    const weight = insight
      ? this.computeProviderLearnedWeight(insight.avgConfidence, insight.fallbackRate).toFixed(2)
      : 'n/a';
    const topModes = insight?.topModes.length ? insight.topModes.join(', ') : 'n/a';
    const fallbackRate = insight ? insight.fallbackRate.toFixed(2) : 'n/a';
    const avgConfidence = insight ? insight.avgConfidence.toFixed(2) : 'n/a';
    const latencyText = typeof latency === 'number' ? `${Math.round(latency)}ms` : 'n/a';
    const circuitText =
      typeof circuitOpenUntil === 'number' && circuitOpenUntil > now
        ? new Date(circuitOpenUntil).toISOString()
        : 'closed';
    return `- ${provider}: status=${status} weight=${weight} avgConfidence=${avgConfidence} fallbackRate=${fallbackRate} latency=${latencyText} circuit=${circuitText} topModes=${topModes}`;
  }

  private computeConnectorStatus(
    provider: string,
    healthySet: Set<string>,
    circuitOpenUntil: number | undefined,
    now: number,
  ): string {
    if (healthySet.has(provider)) {
      return 'healthy';
    }
    if (circuitOpenUntil !== undefined && circuitOpenUntil > now) {
      return 'circuit_open';
    }
    return 'unhealthy';
  }

  private buildRouterEducationSection(snapshot: RoutingEducationSnapshot | null): string {
    const lines: string[] = ['ROUTER EDUCATION SNAPSHOT (thumbs + judge + execution outcomes):'];

    if (!snapshot) {
      lines.push('- No education snapshot available yet.');
      return lines.join('\n');
    }

    lines.push(
      `- version=${snapshot.version} decisions=${snapshot.summary.decisionsAnalyzed} feedbackEvents=${snapshot.summary.feedbackEvents} outcomes=${snapshot.summary.outcomesAnalyzed}`,
    );

    if (snapshot.promptHints.bestModelsByTaskFamily.length > 0) {
      lines.push('- Best task-family models:');
      for (const hint of snapshot.promptHints.bestModelsByTaskFamily.slice(0, 8)) {
        lines.push(
          `  - ${hint.taskFamily}: ${hint.provider}/${hint.model} success=${hint.weightedSuccessScore.toFixed(2)} trust=${hint.confidenceInProfile.toFixed(2)}`,
        );
      }
    }

    if (snapshot.promptHints.cautionModels.length > 0) {
      lines.push('- Caution models:');
      for (const hint of snapshot.promptHints.cautionModels.slice(0, 6)) {
        lines.push(
          `  - ${hint.taskFamily}: avoid ${hint.provider}/${hint.model} when a stronger route is available (risk=${hint.weightedDissatisfactionScore.toFixed(2)})`,
        );
      }
    }

    if (snapshot.promptHints.ambiguousTaskFamilies.length > 0) {
      lines.push('- Ambiguous families:');
      for (const hint of snapshot.promptHints.ambiguousTaskFamilies.slice(0, 6)) {
        lines.push(
          `  - ${hint.taskFamily}: ambiguity=${hint.ambiguityScore.toFixed(2)} -> ${hint.recommendation}`,
        );
      }
    }

    lines.push(
      '- Use learned priors as bounded hints. Do not overfit to tiny sample sizes or unhealthy providers.',
    );

    return lines.join('\n');
  }

  private buildRoutingSignalsSection(routingSignals?: RouterRoutingSignals): string {
    const lines: string[] = ['ROUTING SIGNALS (runtime context):'];

    if (!routingSignals) {
      lines.push('- No live latency or circuit data available.');
      return lines.join('\n');
    }

    const latencyEntries = Object.entries(routingSignals.providerLatencyMs ?? {})
      .filter(([, latency]) => typeof latency === 'number' && latency > 0)
      .sort((a, b) => a[1] - b[1]);
    const openCircuits = Object.entries(routingSignals.providerCircuitOpenUntil ?? {})
      .filter(([, openUntil]) => typeof openUntil === 'number' && openUntil > Date.now())
      .sort((a, b) => a[1] - b[1]);

    lines.push(
      `- latency penalty step ms: ${String(routingSignals.latencyPenaltyStepMs ?? 'n/a')}`,
      `- local degrade threshold ms: ${String(routingSignals.localDegradeLatencyMs ?? 'n/a')}`,
    );

    if (latencyEntries.length > 0) {
      lines.push(
        `- provider latency ms: ${latencyEntries.map(([provider, latency]) => `${provider}=${String(Math.round(latency))}`).join(', ')}`,
      );
    } else {
      lines.push('- provider latency ms: unavailable');
    }

    if (openCircuits.length > 0) {
      lines.push(
        `- open circuits: ${openCircuits.map(([provider, openUntil]) => `${provider} until ${new Date(openUntil).toISOString()}`).join(', ')}`,
      );
    } else {
      lines.push('- open circuits: none');
    }

    return lines.join('\n');
  }

  private inferCapabilities(model: InstalledModelInfo, roles: string[]): string[] {
    const inferred = new Set<string>();

    for (const role of roles) {
      switch (role) {
        case 'LOCAL_CODING':
          inferred.add('code_generation');
          inferred.add('debugging');
          inferred.add('refactoring');
          break;
        case 'LOCAL_REASONING':
          inferred.add('reasoning');
          inferred.add('analysis');
          inferred.add('math');
          break;
        case 'LOCAL_THINKING':
          inferred.add('research');
          inferred.add('trade_offs');
          inferred.add('deep_analysis');
          break;
        case 'LOCAL_FILE_GENERATION':
          inferred.add('document_creation');
          inferred.add('reports');
          inferred.add('spreadsheets');
          break;
        case 'LOCAL_FALLBACK_CHAT':
          inferred.add('general_chat');
          inferred.add('summarization');
          inferred.add('drafting');
          break;
        default:
          break;
      }
    }

    const category = (model.category ?? '').toLowerCase();
    if (category === 'coding') {
      inferred.add('code_generation');
    } else if (category === 'reasoning' || category === 'science' || category === 'engineering') {
      inferred.add('reasoning');
    } else if (category === 'business' || category === 'operations') {
      inferred.add('document_creation');
    }

    return [...inferred];
  }

  private classifySizeBand(sizeBytes: number | null): string {
    if (sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return 'unknown';
    }

    if (sizeBytes < 1_500_000_000) {
      return 'tiny';
    }
    if (sizeBytes < 6_000_000_000) {
      return 'small';
    }
    if (sizeBytes < 16_000_000_000) {
      return 'medium';
    }
    if (sizeBytes < 40_000_000_000) {
      return 'large';
    }
    return 'huge';
  }

  private computeProviderLearnedWeight(avgConfidence: number, fallbackRate: number): number {
    const confidence = Math.max(0, Math.min(1, avgConfidence));
    const fallbackPenalty = Math.max(0, Math.min(1, fallbackRate));
    return confidence * (1 - fallbackPenalty);
  }

  private async getAdaptiveInsights(): Promise<AdaptiveLearningInsights | null> {
    if (!this.adaptiveLearningManager) {
      return null;
    }

    const cache = this.cachedInsights;
    if (cache && Date.now() - cache.generatedAt <= cache.ttlMs) {
      return cache.insights;
    }

    try {
      const insights = await this.adaptiveLearningManager.computeInsights(30);
      this.cachedInsights = {
        insights,
        generatedAt: Date.now(),
        ttlMs: PROMPT_CACHE_TTL_MS,
      };
      return insights;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`getAdaptiveInsights: failed - ${msg}`);
      return null;
    }
  }

  private async getRouterEducationSnapshot(): Promise<RoutingEducationSnapshot | null> {
    if (!this.routerEducationManager) {
      return null;
    }

    try {
      return await this.routerEducationManager.getLatestSnapshot();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`getRouterEducationSnapshot: failed - ${msg}`);
      return null;
    }
  }
}
