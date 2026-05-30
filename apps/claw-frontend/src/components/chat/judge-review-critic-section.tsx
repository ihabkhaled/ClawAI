import type { JudgeReviewCriticSectionProps } from '@/types';

// Single-responsibility critic body for the Judge Review modal. Encapsulates
// the four mutually-exclusive surfacing paths so the parent doesn't nest
// ternaries (forbidden by the no-nested-ternary lint rule):
//   1. Critic was not requested  → "Critic was not requested." copy
//   2. Critic feedback exists     → optional summary + bullet list
//   3. Critic parse failed        → criticSummary OR no-feedback fallback
//   4. Critic ran but empty       → criticSummary OR no-feedback fallback
//
// Cases 3 and 4 produce the same render today; they stay separate so future
// FE polish (e.g. a different icon on parse-failure) can branch cleanly.
export function JudgeReviewCriticSection({
  criticRequested,
  criticParseFailed,
  criticFeedback,
  criticSummary,
  t,
}: JudgeReviewCriticSectionProps): React.ReactElement {
  if (criticRequested === false) {
    return (
      <p className="text-sm text-muted-foreground">{t('compare.critic.notRequested')}</p>
    );
  }

  if (criticFeedback.length > 0) {
    return (
      <>
        {criticSummary.length > 0 ? (
          <p className="text-sm text-foreground">{criticSummary}</p>
        ) : null}
        <ul className="space-y-1 text-sm text-muted-foreground">
          {criticFeedback.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </>
    );
  }

  const fallbackCopy =
    criticSummary.length > 0 ? criticSummary : t('chat.judgeNoCriticFeedback');

  if (criticParseFailed) {
    return <p className="text-sm text-muted-foreground">{fallbackCopy}</p>;
  }

  return <p className="text-sm text-muted-foreground">{fallbackCopy}</p>;
}
