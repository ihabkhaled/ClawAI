import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { AI_ACTION_FALLBACK_LOCAL_PROVIDER } from '../../ai-actions/constants/ai-action-prompts.constants';
import { ModelCatalogResolverManager } from '../../ai-actions/managers/model-catalog-resolver.manager';
import type { ModelChoice } from '../../ai-actions/types/ai-action.types';
import { callCloudGenerate } from '../../ai-actions/utilities/cloud-generation-client.utility';
import { callOllamaGenerate } from '../../ai-actions/utilities/ollama-generation-client.utility';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { MAX_NL_DRAFT_ATTEMPTS_PER_MODEL } from '../constants/chain-nl-draft.constants';
import { chainDslSchema } from '../dto/chain.dto';
import type { ChainDsl } from '../types/chain.types';
import {
  buildChainNlDraftPrompt,
  buildChainNlDraftRetryPrompt,
} from '../utilities/chain-nl-draft-prompt.utility';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

/**
 * Phase 09 (scoped slice) — "NL → chain draft, human reviews and clicks
 * Run": turns a short natural-language request into an unpersisted
 * `ChainDsl` the caller can review, edit, and save via the existing
 * `POST /workspace/chains` (same manual-fill-in pattern Phase 07's
 * templates use for payload fields).
 *
 * Explicitly NOT built here: auto-triggering off a `WorkspaceEvent`
 * (nothing in this repo connects the event fabric to chain execution yet
 * — see the gap-map doc), and any guarantee that the model's JSON is
 * schema-valid on the first try (chat-service has no structured-output
 * mode — see chain-nl-draft-prompt.utility.ts) — hence the one retry with
 * the Zod error appended, then a clean failure rather than a fabricated
 * chain.
 */
@Injectable()
export class ChainNlDraftManager {
  private readonly logger = new Logger(ChainNlDraftManager.name);

  constructor(
    private readonly connectorRepo: WorkspaceConnectorRepository,
    private readonly modelResolver: ModelCatalogResolverManager,
  ) {}

  async draft(userId: string, prompt: string): Promise<ChainDsl> {
    const connectors = await this.loadAuthenticatedConnectors(userId);
    if (connectors.length === 0) {
      throw new BusinessException(
        'workspace.chain_nl_draft.no_connectors',
        'NO_CONNECTORS',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { primary, fallbackChain } = await this.modelResolver.resolveDefaults({});
    if (primary === null) {
      throw new BusinessException(
        'workspace.chain_nl_draft.no_model_available',
        'NO_MODEL_AVAILABLE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const models = [primary, ...fallbackChain];

    const { systemPrompt, userPrompt } = buildChainNlDraftPrompt(connectors, prompt);
    const connectorIds = new Set(connectors.map((c) => c.id));

    let lastError = 'no attempt made';
    for (const model of models) {
      let currentUserPrompt = userPrompt;
      for (let attempt = 1; attempt <= MAX_NL_DRAFT_ATTEMPTS_PER_MODEL; attempt += 1) {
        try {
          const content = await this.generate(model, systemPrompt, currentUserPrompt, userId);
          const dsl = this.parseAndValidate(content, connectorIds);
          return dsl;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `draft: ${model.provider}/${model.model} attempt ${String(attempt)} failed — ${lastError}`,
          );
          currentUserPrompt = buildChainNlDraftRetryPrompt(userPrompt, lastError);
        }
      }
    }

    throw new BusinessException(
      'workspace.chain_nl_draft.failed',
      'CHAIN_NL_DRAFT_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { lastError },
    );
  }

  private async loadAuthenticatedConnectors(
    userId: string,
  ): Promise<Array<{ id: string; provider: WorkspaceProvider }>> {
    const result = await this.connectorRepo.findAllByUser(userId, { page: 1, pageSize: 100 });
    return result.data
      .filter((c) => c.encryptedTokens !== null)
      .map((c) => ({ id: c.id, provider: c.provider as WorkspaceProvider }));
  }

  /**
   * One draft attempt against one model.
   *
   * `draft` runs this up to MAX_NL_DRAFT_ATTEMPTS_PER_MODEL times per model
   * across the whole fallback chain, and each pass is a separate paid provider
   * call — the retry re-asks with the Zod error appended, it does not replay the
   * first answer. So each is separately reserved inside chat-service; only the
   * local Ollama branch above is free.
   */
  private async generate(
    model: ModelChoice,
    systemPrompt: string,
    userPrompt: string,
    userId: string,
  ): Promise<string> {
    const config = AppConfig.get();
    if (model.provider === AI_ACTION_FALLBACK_LOCAL_PROVIDER) {
      const result = await callOllamaGenerate({
        baseUrl: config.OLLAMA_SERVICE_URL,
        model: model.model,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        timeoutMs: config.AI_ACTION_REQUEST_TIMEOUT_MS,
      });
      return result.content;
    }
    const result = await callCloudGenerate({
      chatServiceUrl: config.CHAT_SERVICE_URL,
      provider: model.provider,
      model: model.model,
      systemPrompt,
      userPrompt,
      timeoutMs: config.AI_ACTION_REQUEST_TIMEOUT_MS,
      userId,
      surface: PaygSurface.WORKSPACE_ACTION,
    });
    return result.content;
  }

  private parseAndValidate(content: string, connectorIds: Set<string>): ChainDsl {
    const stripped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let raw: unknown;
    try {
      raw = JSON.parse(stripped);
    } catch {
      throw new Error('response was not valid JSON');
    }

    // The model is explicitly allowed to say "nothing maps" via an empty
    // steps array — chainDslSchema itself requires >=1 step (a save-time
    // rule, not a draft-time one), so that specific shape is accepted here
    // without going through the stricter schema below.
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'steps' in raw &&
      Array.isArray((raw as { steps: unknown }).steps) &&
      (raw as { steps: unknown[] }).steps.length === 0
    ) {
      return { steps: [] };
    }

    const parsed = chainDslSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`response did not match the chain schema: ${parsed.error.message}`);
    }

    const unknownConnector = parsed.data.steps.find((step) => !connectorIds.has(step.connectorId));
    if (unknownConnector !== undefined) {
      throw new Error(
        `step "${unknownConnector.id}" used connectorId "${unknownConnector.connectorId}", which is not one of the caller's connected accounts`,
      );
    }

    return parsed.data;
  }
}
