import { BadRequestException } from '@nestjs/common';

import { MICRO_USD_DECIMALS } from '../constants/step-recorder.constants';
import type { RetryGenerationDto } from '../dto/retry-generation.dto';
import { normalizeAcceptedGaps } from './accepted-gaps.utility';
import type { EnqueueGenerationDto } from '../dto/enqueue-generation.dto';
import type { ModelRole } from '../types/generation-pipeline.types';

/** Decimal formatting only, no float arithmetic: 1.5 USD becomes "1500000" micro-USD. */
export function usdToMicroUsd(usd: number): string {
  const [whole = '0', fraction = ''] = usd.toFixed(MICRO_USD_DECIMALS).split('.');
  const micro = `${whole}${fraction}`.replace(/^0+(?=\d)/u, '');
  if (!/^\d{1,16}$/u.test(micro) || micro === '0') {
    throw new BadRequestException('Spend cap is out of range');
  }
  return micro;
}

function applyModel(role: ModelRole, models: NonNullable<RetryGenerationDto['models']>): ModelRole {
  const override = models.find((item) => item.roleId === role.id);
  if (!override) return role;
  return {
    ...role,
    provider: override.provider,
    model: override.model,
    // A fallback that is the new primary itself adds nothing; another model of its provider does.
    fallbacks: role.fallbacks.filter(
      (fallback) => fallback.provider !== override.provider || fallback.model !== override.model,
    ),
  };
}

/** The new job's request: the failed job's pinned request plus the owner's allowed changes. */
export function buildRetryInput(
  original: EnqueueGenerationDto,
  change: RetryGenerationDto,
): EnqueueGenerationDto {
  const models = change.models ?? [];
  const roleIds = new Set([
    original.judge.id,
    original.critic.id,
    ...original.authors.map(({ id }) => id),
  ]);
  if (models.some(({ roleId }) => !roleIds.has(roleId))) {
    throw new BadRequestException('Unknown role in model changes');
  }
  // A retry of a retry must not inherit the earlier "research more" or accepted gaps: each is
  // the owner's choice for that one retry (ADR-193, ADR-194).
  const { refreshResearch: _previous, acceptedEvidenceGaps: _previousGaps, ...pinned } = original;
  const acceptedGaps = normalizeAcceptedGaps(change.acceptedEvidenceGaps);
  return {
    ...pinned,
    ...(change.refreshResearch === true ? { refreshResearch: true } : {}),
    ...(acceptedGaps.length > 0 ? { acceptedEvidenceGaps: acceptedGaps } : {}),
    idempotencyKey: change.idempotencyKey,
    // Deterministic, so repeating the same retry call is idempotent.
    correlationId: `retry:${change.idempotencyKey}`.slice(0, 200),
    topic: change.topic ?? original.topic,
    articleLength: change.articleLength ?? original.articleLength,
    healing: change.healing ?? original.healing,
    spendCapMicroUsd:
      change.spendCapUsd === undefined
        ? original.spendCapMicroUsd
        : usdToMicroUsd(change.spendCapUsd),
    authors: original.authors.map((role) => applyModel(role, models)),
    judge: applyModel(original.judge, models),
    critic: applyModel(original.critic, models),
  };
}
