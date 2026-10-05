import type { ThreadPublicationType } from '@/constants/thread-publication.constants';
import type { Locale } from '@/enums/locale.enum';
import type { ModelSelection } from '@/types';

export type ThreadGenerationRequestInput = {
  sourceThreadId: string;
  topic: string;
  publicationType: ThreadPublicationType;
  contentLocale: Locale;
  spendCapUsd: number;
  models: ModelSelection[];
  idempotencyKey: string;
  correlationId: string;
};

export type ThreadGenerationRequest = {
  capMicroUsd: number;
  sourceThreadId: string;
  idempotencyKey: string;
  correlationId: string;
  publicIntentVersion: 'threads-public-v1';
  topic: string;
  publicationType: ThreadPublicationType;
  contentLocale: Locale;
  authors: Array<{
    id: string;
    provider: string;
    model: string;
    maxOutputTokens: number;
    fallbacks: Array<{ provider: string; model: string }>;
  }>;
  judge: {
    id: string;
    provider: string;
    model: string;
    maxOutputTokens: number;
    fallbacks: Array<{ provider: string; model: string }>;
  };
  critic: {
    id: string;
    provider: string;
    model: string;
    maxOutputTokens: number;
    fallbacks: Array<{ provider: string; model: string }>;
  };
};

export function createThreadGenerationRequest(
  input: ThreadGenerationRequestInput,
): ThreadGenerationRequest {
  const capMicroUsd = Math.round(input.spendCapUsd * 1_000_000);
  if (!Number.isSafeInteger(capMicroUsd) || capMicroUsd <= 0) {
    throw new Error('A positive, safe spend cap is required');
  }
  if (
    input.models.length !== 5 ||
    input.models.some(({ provider, model }) => !provider || !model)
  ) {
    throw new Error('Select a model for every author and reviewer');
  }
  const [authorOne, authorTwo, authorThree, judgeModel, criticModel] = input.models;
  if (!authorOne || !authorTwo || !authorThree || !judgeModel || !criticModel) {
    throw new Error('Select a model for every author and reviewer');
  }

  const toRole = (selection: ModelSelection, id: string) => ({
    id,
    provider: selection.provider,
    model: selection.model,
    maxOutputTokens: 4096,
    fallbacks: [],
  });

  return {
    capMicroUsd,
    sourceThreadId: input.sourceThreadId,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    publicIntentVersion: 'threads-public-v1' as const,
    topic: input.topic.trim(),
    publicationType: input.publicationType,
    contentLocale: input.contentLocale,
    authors: [authorOne, authorTwo, authorThree].map((model, index) =>
      toRole(model, `author-${index + 1}`),
    ),
    judge: toRole(judgeModel, 'judge'),
    critic: toRole(criticModel, 'critic'),
  };
}
