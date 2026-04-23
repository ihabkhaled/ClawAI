import { JudgeResponseType, JudgeReviewDecision } from '@/enums';
import type { TranslateFunction } from '@/types/i18n.types';

export function getJudgeDecisionTone(decision: JudgeReviewDecision): string {
  if (decision === JudgeReviewDecision.ESCALATE) {
    return 'border-blue-500/50 text-blue-600 dark:text-blue-400';
  }

  if (decision === JudgeReviewDecision.REVISE) {
    return 'border-amber-500/50 text-amber-600 dark:text-amber-400';
  }

  return 'border-green-500/50 text-green-600 dark:text-green-400';
}

export function getJudgeDecisionLabel(decision: JudgeReviewDecision, t: TranslateFunction): string {
  if (decision === JudgeReviewDecision.ESCALATE) {
    return t('chat.judgeEscalated');
  }

  if (decision === JudgeReviewDecision.REVISE) {
    return t('chat.judgeRevised');
  }

  return t('chat.judgeVerified');
}

export function getJudgeResponseTypeLabel(
  responseType: JudgeResponseType,
  t: TranslateFunction,
): string {
  if (responseType === JudgeResponseType.ESCALATED_ANSWER) {
    return t('chat.judgeResponseTypeEscalatedAnswer');
  }

  if (responseType === JudgeResponseType.REVISED_ANSWER) {
    return t('chat.judgeResponseTypeRevisedAnswer');
  }

  if (responseType === JudgeResponseType.SUMMARY) {
    return t('chat.judgeResponseTypeSummary');
  }

  return t('chat.judgeResponseTypeVerificationNote');
}
