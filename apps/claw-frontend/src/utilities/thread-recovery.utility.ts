import {
  ThreadArticleLength,
  type ThreadGenerationFailure,
  type ThreadGenerationHealing,
  type ThreadGenerationRetryRequest,
  ThreadFailureRemedy,
  type ThreadHealingAttempt,
} from '@claw/shared-types';

import { THREAD_GENERATION_CODE_KEYS } from '@/constants/thread-generation-progress.constants';
import {
  THREAD_AUTHOR_ROLE_KIND,
  THREAD_CRITIC_ROLE_KIND,
  THREAD_FORM_REMEDIES,
  THREAD_JUDGE_ROLE_KIND,
  THREAD_MODEL_SWAP_STRATEGIES,
  THREAD_RECOVERY_MAX_REMEDIES,
  THREAD_REMEDY_LABEL_KEYS,
} from '@/constants/thread-recovery.constants';
import type {
  BuildRecoveryRetryInput,
  ThreadHealingAttemptView,
  ThreadRecoveryAction,
} from '@/types/thread-generation-progress.types';

const MODEL_SEPARATOR = ' / ';

function modelLabel(provider: string | null, model: string | null): string {
  return [provider, model].filter(Boolean).join(MODEL_SEPARATOR);
}

/**
 * The buttons for a failed job, in the order the service gave them, at most three. A failure from
 * an older service carries no remedies, so the panel shows nothing and the old card stays.
 */
export function buildRecoveryActions(failure: ThreadGenerationFailure): ThreadRecoveryAction[] {
  const suggested = failure.suggestedModel ?? null;
  return (failure.remedies ?? [])
    .filter((remedy) => remedy !== ThreadFailureRemedy.TRY_SUGGESTED_MODEL || suggested !== null)
    .slice(0, THREAD_RECOVERY_MAX_REMEDIES)
    .map((remedy): ThreadRecoveryAction => ({
      remedy,
      labelKey: THREAD_REMEDY_LABEL_KEYS[remedy],
      params:
        remedy === ThreadFailureRemedy.TRY_SUGGESTED_MODEL && suggested !== null
          ? { model: modelLabel(suggested.provider, suggested.model) }
          : ({} as Record<string, string>),
      oneClick: !THREAD_FORM_REMEDIES.has(remedy) && remedy !== ThreadFailureRemedy.ADD_CREDIT,
    }));
}

function seatsByRole(
  input: BuildRecoveryRetryInput,
): Array<{ roleId: string; provider: string; model: string }> {
  const { team, progress } = input;
  if (team === null) {
    return [];
  }
  const authors = progress.selections.roles.filter(
    ({ roleKind }) => roleKind === THREAD_AUTHOR_ROLE_KIND,
  );
  const seat = (kind: string, roleId: string, ref: { provider: string; model: string }) =>
    progress.selections.roles.some((role) => role.roleId === roleId && role.roleKind === kind)
      ? [{ roleId, provider: ref.provider, model: ref.model }]
      : [];
  const judge = progress.selections.roles.find(
    ({ roleKind }) => roleKind === THREAD_JUDGE_ROLE_KIND,
  );
  const critic = progress.selections.roles.find(
    ({ roleKind }) => roleKind === THREAD_CRITIC_ROLE_KIND,
  );
  return [
    ...authors.flatMap(({ roleId }, index) => {
      const ref = team.authors[index];
      return ref === undefined ? [] : seat(THREAD_AUTHOR_ROLE_KIND, roleId, ref);
    }),
    ...(judge === undefined ? [] : seat(THREAD_JUDGE_ROLE_KIND, judge.roleId, team.judge)),
    ...(critic === undefined ? [] : seat(THREAD_CRITIC_ROLE_KIND, critic.roleId, team.critic)),
  ];
}

/**
 * The retry body of a one-click remedy, or null when it cannot be built (no suggested model, no
 * recommended team for this account). The service resumes at the failed phase on its own, so the
 * body only says what to change: nothing, one role's model, every role's model, or the length.
 */
export function buildRecoveryRetryRequest(
  input: BuildRecoveryRetryInput,
): ThreadGenerationRetryRequest | null {
  const { remedy, progress, idempotencyKey } = input;
  const failure = progress.failure;
  switch (remedy) {
    case ThreadFailureRemedy.TRY_AGAIN:
      return { idempotencyKey };
    case ThreadFailureRemedy.SHORTER_ARTICLE:
      return { idempotencyKey, articleLength: ThreadArticleLength.SHORT };
    case ThreadFailureRemedy.TRY_SUGGESTED_MODEL: {
      const suggested = failure?.suggestedModel ?? null;
      const roleId = failure?.roleId ?? null;
      return suggested === null || roleId === null
        ? null
        : {
            idempotencyKey,
            models: [{ roleId, provider: suggested.provider, model: suggested.model }],
          };
    }
    case ThreadFailureRemedy.USE_RECOMMENDED_TEAM: {
      const models = seatsByRole(input);
      return models.length === 0 ? null : { idempotencyKey, models };
    }
    case ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL:
    case ThreadFailureRemedy.RAISE_SPEND_CAP:
    case ThreadFailureRemedy.ADD_CREDIT:
    case ThreadFailureRemedy.CHANGE_TOPIC:
      return null;
  }
}

/** Key of the code message for a healing strategy, e.g. HEAL_BACKOFF_RETRY to the wording for it. */
export function healingMessageKey(code: string): string {
  const known = THREAD_GENERATION_CODE_KEYS[code];
  return `chat.threadProgress.code.${known ?? 'unknown'}`;
}

/** The attempts the panel lists, newest last, each with its wording and the model it used. */
export function viewHealingAttempts(
  healing: ThreadGenerationHealing | undefined,
): ThreadHealingAttemptView[] {
  return (healing?.attempts ?? []).map((attempt: ThreadHealingAttempt) => ({
    attempt,
    messageKey: healingMessageKey(attempt.strategy),
    model: modelLabel(attempt.provider, attempt.model),
  }));
}

/** Key of the line shown while the service is healing: a swap says so, other steps say "smarter". */
export function healingNoticeKey(healing: ThreadGenerationHealing | undefined): string | null {
  const last = healing?.attempts.at(-1);
  if (healing === undefined || !healing.active || last === undefined) {
    return null;
  }
  return THREAD_MODEL_SWAP_STRATEGIES.has(last.strategy)
    ? 'chat.threadProgress.recovery.retryingModel'
    : 'chat.threadProgress.recovery.retryingSmarter';
}
