import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JudgeRefereeDetailsProps } from '@/types';

export function JudgeRefereeDetails({
  criticFeedback,
  criticScore,
  judgeDecision,
  judgeReasoning,
  judgeConfidence,
}: JudgeRefereeDetailsProps): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!judgeDecision) {
    return null;
  }

  return (
    <div className="mt-1 text-xs">
      <button
        type="button"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Judge Details
      </button>
      {isExpanded ? (
        <div className={cn('mt-2 space-y-2 rounded-md border border-border bg-muted/50 p-3')}>
          <div>
            <span className="font-medium">Critic Score: </span>
            <Badge variant="secondary" className="text-xs">
              {String(Math.round(criticScore * 100))}%
            </Badge>
          </div>
          {criticFeedback.length > 0 ? (
            <div>
              <span className="font-medium">Critic Feedback:</span>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                {criticFeedback.map((item, idx) => (
                  <li key={`feedback-${String(idx)}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <span className="font-medium">Judge Decision: </span>
            <span>{judgeDecision}</span>
            <span className="ml-2 text-muted-foreground">
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
      ) : null}
    </div>
  );
}
