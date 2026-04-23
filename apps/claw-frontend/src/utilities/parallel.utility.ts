import {
  PARALLEL_GRID_COL_CLASSES,
  SCORE_DEFAULT_TOKEN_VALUE,
  SCORE_LATENCY_DIVISOR,
  SCORE_LATENCY_WEIGHT,
  SCORE_LENGTH_DIVISOR,
  SCORE_LENGTH_WEIGHT,
  SCORE_TOKEN_DIVISOR,
  SCORE_TOKEN_WEIGHT,
} from '@/constants';
import { CompareJudgeState, ParallelModelStatus } from '@/enums';
import type { ChatMessage, JudgeReview, MessageRenderItem, ParallelModelResponse } from '@/types';

import { getJudgeReviewFromMessage } from './judge-review.utility';

export function groupParallelMessages(messages: ChatMessage[]): MessageRenderItem[] {
  const items: MessageRenderItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (!msg) {
      i++;
      continue;
    }
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.['parallelExecution'] === true) {
      const groupId = meta['parallelGroupId'];
      const group: ChatMessage[] = [msg];
      let j = i + 1;
      while (j < messages.length) {
        const next = messages[j];
        if (!next) {
          break;
        }
        const nextMeta = next.metadata as Record<string, unknown> | null;
        if (nextMeta?.['parallelExecution'] !== true) {
          break;
        }
        if (groupId !== undefined && nextMeta['parallelGroupId'] !== groupId) {
          break;
        }
        group.push(next);
        j++;
      }
      items.push({ kind: 'parallel', messages: group });
      i = j;
    } else {
      items.push({ kind: 'single', message: msg });
      i++;
    }
  }
  return items;
}

export function getParallelColClass(count: number): string {
  return PARALLEL_GRID_COL_CLASSES[String(count)] ?? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';
}

export function getFastestModel(responses: ParallelModelResponse[]): string | null {
  const completed = responses.filter((r) => r.status === ParallelModelStatus.COMPLETED);
  if (completed.length === 0) {
    return null;
  }
  const fastest = completed.reduce((prev, curr) => (curr.latencyMs < prev.latencyMs ? curr : prev));
  return fastest.model;
}

export function scoreResponse(response: ParallelModelResponse): number {
  if (response.status !== ParallelModelStatus.COMPLETED) {
    return 0;
  }
  const lengthScore = Math.min(response.content.length / SCORE_LENGTH_DIVISOR, 1.0);
  const latencyScore = Math.max(0, 1.0 - response.latencyMs / SCORE_LATENCY_DIVISOR);
  const tokenScore = response.outputTokens
    ? Math.min(response.outputTokens / SCORE_TOKEN_DIVISOR, 1.0)
    : SCORE_DEFAULT_TOKEN_VALUE;
  return (
    lengthScore * SCORE_LENGTH_WEIGHT +
    latencyScore * SCORE_LATENCY_WEIGHT +
    tokenScore * SCORE_TOKEN_WEIGHT
  );
}

export function messageToParallelResponse(msg: ChatMessage): ParallelModelResponse {
  const meta = msg.metadata as Record<string, unknown> | null;
  const status = (meta?.['status'] as string) ?? ParallelModelStatus.COMPLETED;
  const errorMessage = (meta?.['errorMessage'] as string) ?? null;
  const judgeReview = getJudgeReviewFromMessage(msg);
  const judgeState = getParallelJudgeState(meta, judgeReview, status as ParallelModelStatus);
  const judgeModel = getString(meta?.['judgeModel']);
  const judgeDisplayName = getString(meta?.['judgeDisplayName'], judgeModel ?? '');

  return {
    provider: msg.provider ?? '',
    model: msg.model ?? '',
    content: msg.content,
    latencyMs: msg.latencyMs ?? 0,
    inputTokens: msg.inputTokens,
    outputTokens: msg.outputTokens,
    status: status as ParallelModelStatus,
    errorMessage,
    judgeEnabled: meta?.['judgeEnabled'] === true,
    judgeModel: judgeModel.length > 0 ? judgeModel : null,
    judgeDisplayName: judgeDisplayName.length > 0 ? judgeDisplayName : null,
    judgeState,
    judgeErrorState: getJudgeErrorState(meta, judgeReview, judgeState),
    judgeDialogAvailable: judgeReview?.judgeDialogAvailable === true,
    judgeReview,
    message: msg,
  };
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getParallelJudgeState(
  meta: Record<string, unknown> | null,
  judgeReview: JudgeReview | null,
  status: ParallelModelStatus,
): CompareJudgeState {
  const rawState = meta?.['judgeState'];
  if (
    rawState === CompareJudgeState.NONE ||
    rawState === CompareJudgeState.AWAITING ||
    rawState === CompareJudgeState.VERIFIED ||
    rawState === CompareJudgeState.REVISED ||
    rawState === CompareJudgeState.ESCALATED ||
    rawState === CompareJudgeState.FAILED ||
    rawState === CompareJudgeState.UNAVAILABLE ||
    rawState === CompareJudgeState.SKIPPED
  ) {
    return rawState;
  }

  if (judgeReview?.judgeDialogAvailable === false) {
    const errorState = meta?.['judgeErrorState'];
    if (
      errorState === CompareJudgeState.FAILED ||
      errorState === CompareJudgeState.UNAVAILABLE ||
      errorState === CompareJudgeState.SKIPPED
    ) {
      return errorState;
    }
  }

  if (judgeReview?.judgeDecision === 'REVISE') {
    return CompareJudgeState.REVISED;
  }

  if (judgeReview?.judgeDecision === 'ESCALATE') {
    return CompareJudgeState.ESCALATED;
  }

  if (judgeReview?.judgeDecision === 'ACCEPT') {
    return judgeReview.judgeDialogAvailable === false
      ? CompareJudgeState.UNAVAILABLE
      : CompareJudgeState.VERIFIED;
  }

  return status === ParallelModelStatus.COMPLETED
    ? CompareJudgeState.NONE
    : CompareJudgeState.SKIPPED;
}

function getJudgeErrorState(
  meta: Record<string, unknown> | null,
  judgeReview: JudgeReview | null,
  judgeState: CompareJudgeState,
): CompareJudgeState | null {
  const rawState = meta?.['judgeErrorState'];
  if (
    rawState === CompareJudgeState.FAILED ||
    rawState === CompareJudgeState.UNAVAILABLE ||
    rawState === CompareJudgeState.SKIPPED
  ) {
    return rawState;
  }

  if (judgeReview?.judgeDialogAvailable === false) {
    return judgeState;
  }

  return null;
}

export function messagesToParallelResponses(messages: ChatMessage[]): ParallelModelResponse[] {
  return messages.map(messageToParallelResponse);
}

export function getFastestMessage(messages: ChatMessage[]): string | null {
  const completed = messages.filter((m) => {
    const meta = m.metadata as Record<string, unknown> | null;
    return (
      (meta?.['status'] as string) !== ParallelModelStatus.FAILED &&
      (meta?.['status'] as string) !== ParallelModelStatus.TIMEOUT
    );
  });
  if (completed.length === 0) {
    return null;
  }
  const fastest = completed.reduce((prev, curr) =>
    (curr.latencyMs ?? Infinity) < (prev.latencyMs ?? Infinity) ? curr : prev,
  );
  return fastest.id;
}

export function getBestResponse(responses: ParallelModelResponse[]): string | null {
  const completed = responses.filter((r) => r.status === ParallelModelStatus.COMPLETED);
  if (completed.length === 0) {
    return null;
  }
  const best = completed.reduce((prev, curr) =>
    scoreResponse(curr) > scoreResponse(prev) ? curr : prev,
  );
  return best.model;
}
