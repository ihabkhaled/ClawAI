import type { FencedTx, ProviderCostInput } from '../types/processing.types';

/** Records one provider call once (idempotencyKey unique; a replay is a no-op, rule 28). */
export async function recordProviderCost(tx: FencedTx, input: ProviderCostInput): Promise<void> {
  await tx.liveProviderCost.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      idempotencyKey: input.idempotencyKey,
      runId: input.runId,
      stage: input.stage,
      provider: input.provider,
      model: input.model,
      units: input.units ?? 0,
      costMicroUsd: BigInt(input.costMicroUsd ?? 0),
      latencyMs: input.latencyMs ?? null,
      succeeded: input.succeeded,
    },
    update: {},
  });
}
