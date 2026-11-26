import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { LivePipelineStage } from '../../../generated/prisma';
import type { LiveModelRef } from '../../policy/types/live-policy.types';
import { LiveModelClient } from '../adapters/live-model.adapter';
import { SUMMARY_MAX_OUTPUT_TOKENS } from '../constants/processing.constants';
import { COUNCIL_MERGE_INSTRUCTION } from '../constants/prompts.constants';
import type {
  FencedTx,
  LiveCouncilChains,
  ModelReply,
  WorkerContext,
} from '../types/processing.types';
import { recordProviderCost } from '../utilities/provider-cost.utility';
import { sanitizeStreamText, streamDataBlock } from '../utilities/stream-prompt.utility';
import { FencedRunWriter } from './fenced-run-writer.service';

/**
 * The analysis model calls of a run (summaries, the final card, the video report). Draft then
 * merge (owner 2026-11-26): every extra agent drafts the same task in parallel, then the main
 * chain writes the one reply from the data plus the valid drafts. Every call is a cost row.
 */
@Injectable()
export class LiveCouncilService {
  constructor(
    private readonly writer: FencedRunWriter,
    private readonly model: LiveModelClient,
  ) {}

  /** No valid draft → the main chain answers alone, exactly as without agents. */
  async draftThenMerge(
    context: WorkerContext,
    chains: LiveCouncilChains,
    request: { system: string; user: string; maxTokens?: number },
    parse: (content: string) => object | null,
  ): Promise<ModelReply | null> {
    const replies = await Promise.all(
      chains.council.map((agent) => this.callModel(context, [agent], request)),
    );
    const drafts: string[] = [];
    for (const reply of replies) {
      if (!reply) continue;
      const draft = parse(reply.content);
      if (draft) drafts.push(sanitizeStreamText(JSON.stringify(draft)));
      await this.writer.commit(context.lease, (tx) =>
        this.recordCost(tx, context, reply, draft !== null),
      );
    }
    if (drafts.length === 0) return this.callModel(context, chains.main, request);
    const draftBlock = streamDataBlock(
      drafts.map((draft, index) => `DRAFT ${String(index + 1)}: ${draft}`).join('\n'),
    );
    return this.callModel(context, chains.main, {
      ...request,
      system: `${request.system}\n${COUNCIL_MERGE_INSTRUCTION}`,
      user: `${request.user}\n${draftBlock}`,
    });
  }

  /** One chain call; a chain where every model failed is recorded as a failed cost row. */
  async callModel(
    context: WorkerContext,
    chain: readonly LiveModelRef[],
    request: { system: string; user: string; maxTokens?: number },
  ): Promise<ModelReply | null> {
    try {
      return await this.model.complete(chain, {
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens ?? SUMMARY_MAX_OUTPUT_TOKENS,
      });
    } catch {
      const failed = { content: '', connector: 'none', model: 'none', latencyMs: 0 };
      await this.writer.commit(context.lease, (tx) => this.recordCost(tx, context, failed, false));
      return null;
    }
  }

  recordCost(
    tx: FencedTx,
    context: WorkerContext,
    reply: ModelReply,
    succeeded: boolean,
  ): Promise<void> {
    return recordProviderCost(tx, {
      idempotencyKey: `summary:${context.lease.runId}:${randomUUID()}`,
      runId: context.lease.runId,
      stage: LivePipelineStage.SUMMARY,
      provider: reply.connector,
      model: reply.model,
      units: reply.content.length,
      costMicroUsd: 0,
      latencyMs: reply.latencyMs,
      succeeded,
    });
  }
}
