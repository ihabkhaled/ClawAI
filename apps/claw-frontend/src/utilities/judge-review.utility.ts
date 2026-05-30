import { JudgeResponseType, JudgeReviewDecision } from '@/enums';
import type { ChatMessage, JudgeReview } from '@/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isJudgeDecision(value: unknown): value is JudgeReviewDecision {
  return (
    value === JudgeReviewDecision.ACCEPT ||
    value === JudgeReviewDecision.REVISE ||
    value === JudgeReviewDecision.ESCALATE
  );
}

function getJudgeResponseType(value: unknown, decision: JudgeReviewDecision): JudgeResponseType {
  if (
    value === JudgeResponseType.SUMMARY ||
    value === JudgeResponseType.REVISED_ANSWER ||
    value === JudgeResponseType.ESCALATED_ANSWER ||
    value === JudgeResponseType.VERIFICATION_NOTE
  ) {
    return value;
  }

  if (decision === JudgeReviewDecision.ESCALATE) {
    return JudgeResponseType.ESCALATED_ANSWER;
  }

  if (decision === JudgeReviewDecision.REVISE) {
    return JudgeResponseType.REVISED_ANSWER;
  }

  return JudgeResponseType.VERIFICATION_NOTE;
}

function normalizeNestedJudgeReview(review: Record<string, unknown>): JudgeReview | null {
  const judgeDecision = review['judgeDecision'];
  if (!isJudgeDecision(judgeDecision)) {
    return null;
  }

  const judgeMetadata = isRecord(review['judgeMetadata']) ? review['judgeMetadata'] : {};

  return {
    version: 1,
    judgeDecision,
    judgeModel: getString(review['judgeModel']),
    judgeDisplayName: getString(review['judgeDisplayName'], getString(review['judgeModel'])),
    judgeConfidence: getNumber(review['judgeConfidence']),
    judgeReasoning: getString(review['judgeReasoning']),
    judgeSummary: getString(review['judgeSummary']),
    judgeResponse: getString(review['judgeResponse']),
    judgeResponseType: getJudgeResponseType(review['judgeResponseType'], judgeDecision),
    criticModel: getString(review['criticModel']),
    criticDisplayName: getString(review['criticDisplayName'], getString(review['criticModel'])),
    criticFeedback: getStringArray(review['criticFeedback']),
    criticScore: getNumber(review['criticScore']),
    criticSummary: getString(review['criticSummary']),
    criticRequested: review['criticRequested'] !== false,
    criticParseFailed: review['criticParseFailed'] === true,
    originalExecutionModel: getString(review['originalExecutionModel']),
    originalExecutionDisplayName: getString(
      review['originalExecutionDisplayName'],
      getString(review['originalExecutionModel']),
    ),
    originalAnswerSnapshot: getString(review['originalAnswerSnapshot']),
    revisedAnswer: getNullableString(review['revisedAnswer']),
    escalatedAnswer: getNullableString(review['escalatedAnswer']),
    judgeLatencyMs: getNumber(review['judgeLatencyMs']),
    criticLatencyMs: getNumber(review['criticLatencyMs']),
    judgeTotalLatencyMs: getNumber(review['judgeTotalLatencyMs']),
    judgeMetadata: {
      category: getString(judgeMetadata['category']),
      recommendedChanges: getStringArray(judgeMetadata['recommendedChanges']),
    },
    judgeDialogAvailable: review['judgeDialogAvailable'] !== false,
    generatedAt: getString(review['generatedAt']),
  };
}

function normalizeLegacyJudgeReview(
  metadata: Record<string, unknown>,
  message: ChatMessage,
): JudgeReview | null {
  const judgeDecision = metadata['judgeDecision'];
  if (!isJudgeDecision(judgeDecision)) {
    return null;
  }

  return {
    version: 1,
    judgeDecision,
    judgeModel: getString(metadata['judgeModel']),
    judgeDisplayName: getString(metadata['judgeModel']),
    judgeConfidence: getNumber(metadata['judgeConfidence']),
    judgeReasoning: getString(metadata['judgeReasoning']),
    judgeSummary: getString(metadata['judgeReasoning']),
    judgeResponse: getString(metadata['judgeReasoning']),
    judgeResponseType: getJudgeResponseType(undefined, judgeDecision),
    criticModel: getString(metadata['criticModel']),
    criticDisplayName: getString(metadata['criticModel']),
    criticFeedback: getStringArray(metadata['criticFeedback']),
    criticScore: getNumber(metadata['criticScore']),
    // Legacy v0 metadata predates criticSummary/criticRequested/criticParseFailed.
    // Default to "critic ran with no surfacable summary" so the modal stays
    // truthful — pre-flagship data did not record a not-requested signal.
    criticSummary: getString(metadata['criticSummary']),
    criticRequested: metadata['criticRequested'] !== false,
    criticParseFailed: metadata['criticParseFailed'] === true,
    originalExecutionModel: [message.provider, message.model].filter(Boolean).join('/'),
    originalExecutionDisplayName: [message.provider, message.model].filter(Boolean).join('/'),
    originalAnswerSnapshot: message.content,
    revisedAnswer: judgeDecision === JudgeReviewDecision.REVISE ? message.content : null,
    escalatedAnswer: judgeDecision === JudgeReviewDecision.ESCALATE ? message.content : null,
    judgeLatencyMs: 0,
    criticLatencyMs: 0,
    judgeTotalLatencyMs: getNumber(metadata['judgeTotalLatencyMs']),
    judgeMetadata: {
      category: '',
      recommendedChanges: [],
    },
    judgeDialogAvailable: true,
    generatedAt: message.createdAt,
  };
}

export function getJudgeReviewFromMessage(message: ChatMessage): JudgeReview | null {
  const metadata = isRecord(message.metadata) ? message.metadata : null;
  if (!metadata) {
    return null;
  }

  const nestedReview = isRecord(metadata['judgeReview']) ? metadata['judgeReview'] : null;
  if (nestedReview) {
    return normalizeNestedJudgeReview(nestedReview);
  }

  return normalizeLegacyJudgeReview(metadata, message);
}
