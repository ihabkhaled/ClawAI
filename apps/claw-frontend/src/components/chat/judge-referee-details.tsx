import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JudgeRefereeDetailsProps } from '@/types';

export function JudgeRefereeDetails({
  criticModel,
  criticFeedback,
  criticScore,
  judgeModel,
  judgeDecision,
  judgeReasoning,
  judgeConfidence,
}: JudgeRefereeDetailsProps): React.ReactElement | null {
  if (!judgeDecision) {
    return null;
  }

  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Judge Details
      </summary>
      <div className={cn('mt-2 space-y-2 rounded-md border border-border bg-muted/50 p-3')}>
        <div>
          <span className="font-medium">Critic: </span>
          <span className="text-muted-foreground">{criticModel}</span>
          <span className="ms-2">
            <Badge variant="secondary" className="text-xs">
              {String(Math.round(criticScore * 100))}%
            </Badge>
          </span>
        </div>
        {criticFeedback.length > 0 ? (
          <div>
            <span className="font-medium">Feedback:</span>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
              {criticFeedback.map((item, idx) => (
                <li key={`feedback-${String(idx)}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <span className="font-medium">Judge: </span>
          <span className="text-muted-foreground">{judgeModel}</span>
          <span className="ms-2">{judgeDecision}</span>
          <span className="ms-2 text-muted-foreground">
            ({String(Math.round(judgeConfidence * 100))}% confidence)
          </span>
        </div>
        {judgeReasoning ? (
          <div>
            <span className="font-medium">Reasoning: </span>
            <span className="text-muted-foreground">{judgeReasoning}</span>
          </div>
        ) : null}
      </div>
    </details>
  );
}
