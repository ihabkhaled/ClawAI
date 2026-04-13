import { ReplayOutcomeLabel } from '@/enums';

export const REPLAY_LIMIT_OPTIONS = [10, 25, 50, 100] as const;

export const REPLAY_DEFAULT_LIMIT = 25;

export const REPLAY_TAB_RESULTS = 'results';
export const REPLAY_TAB_NEEDS_REVIEW = 'needs-review';
export const REPLAY_TAB_HISTORY = 'history';

export const OUTCOME_LABEL_COLORS: Record<ReplayOutcomeLabel, string> = {
  [ReplayOutcomeLabel.CORRECT_IMPROVEMENT]: 'text-emerald-600',
  [ReplayOutcomeLabel.BAD_REGRESSION]: 'text-destructive',
  [ReplayOutcomeLabel.COST_WIN]: 'text-blue-600',
  [ReplayOutcomeLabel.QUALITY_WIN]: 'text-violet-600',
  [ReplayOutcomeLabel.UNCERTAIN]: 'text-muted-foreground',
};

export const OUTCOME_LABEL_BADGE_VARIANTS: Record<
  ReplayOutcomeLabel,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  [ReplayOutcomeLabel.CORRECT_IMPROVEMENT]: 'default',
  [ReplayOutcomeLabel.BAD_REGRESSION]: 'destructive',
  [ReplayOutcomeLabel.COST_WIN]: 'outline',
  [ReplayOutcomeLabel.QUALITY_WIN]: 'default',
  [ReplayOutcomeLabel.UNCERTAIN]: 'secondary',
};
