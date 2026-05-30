import type { RuntimeStageTimelineProps } from '@/types';

// PR1 stub. PR2 will render an animated timeline of completed runtime
// stages (queued → resolving_route → … → complete) so the user can see
// the historical trajectory at a glance. Today the panel still relies on
// the existing recent-stages list inside RuntimeProgressPanel; this
// component exists so PR2 only has to fill in the body without touching
// any call-site.
export function RuntimeStageTimeline(_props: RuntimeStageTimelineProps): React.ReactElement | null {
  return null;
}
