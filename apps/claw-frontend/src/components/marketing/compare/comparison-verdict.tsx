import type { ComparisonVerdictProps } from '@/types/public-comparison.types';

/**
 * The "which one to choose" pair.
 *
 * The rival's panel comes first and is not hedged. A comparison page that cannot
 * name a case where the competitor is the better answer is an advertisement, and
 * readers — and the assistants that summarise pages like this one — treat it as
 * one.
 */
export function ComparisonVerdict({
  title,
  clawLabel,
  clawBody,
  rivalLabel,
  rivalBody,
}: ComparisonVerdictProps): React.ReactElement {
  return (
    <div className="editorial-comparison__verdict" aria-label={title}>
      <div className="editorial-comparison__verdict-panel">
        <p className="editorial-comparison__verdict-label">{rivalLabel}</p>
        <p className="editorial-comparison__verdict-body">{rivalBody}</p>
      </div>
      <div className="editorial-comparison__verdict-panel editorial-comparison__verdict-panel--claw">
        <p className="editorial-comparison__verdict-label">{clawLabel}</p>
        <p className="editorial-comparison__verdict-body">{clawBody}</p>
      </div>
    </div>
  );
}
