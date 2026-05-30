import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeBottleneckBreakdown } from '@/components/chat/runtime-progress';
import { AiStreamProgressConfidence } from '@/enums';
import type { StreamMetrics } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

const richMetrics: StreamMetrics = {
  elapsedMs: 3000,
  generatedTokens: 40,
  progressPercent: 100,
  progressConfidence: AiStreamProgressConfidence.EXACT,
  modelLoadMs: 500,
  promptEvalMs: 200,
  generationMs: 2300,
  bottleneck: { stage: 'generation', durationMs: 2300, percentOfTotal: 0.77 },
};

describe('RuntimeBottleneckBreakdown', () => {
  it('renders nothing when no per-stage durations are available', () => {
    const { container } = render(
      <RuntimeBottleneckBreakdown stageTimings={null} metrics={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modelLoad / promptEval / generation legend rows when metrics carry rich durations', () => {
    render(<RuntimeBottleneckBreakdown stageTimings={null} metrics={richMetrics} />);
    expect(screen.getByText('runtimeProgress.bottleneck.modelLoad')).toBeInTheDocument();
    expect(screen.getByText('runtimeProgress.bottleneck.promptEval')).toBeInTheDocument();
    expect(screen.getByText('runtimeProgress.bottleneck.generation')).toBeInTheDocument();
    expect(screen.getByText('runtimeProgress.bottleneck.title')).toBeInTheDocument();
  });

  it('renders the bottleneck stage with a highlight ring class', () => {
    const { container } = render(
      <RuntimeBottleneckBreakdown stageTimings={null} metrics={richMetrics} />,
    );
    const ringed = container.querySelectorAll('div[style*="width"]');
    expect(ringed.length).toBe(3);
    // At least one segment should have the highlight class.
    const hasRing = Array.from(ringed).some((el) => el.className.includes('ring-2'));
    expect(hasRing).toBe(true);
  });

  it('returns null when metrics lack any positive stage duration', () => {
    const emptyMetrics: StreamMetrics = {
      elapsedMs: 100,
      generatedTokens: 0,
      progressPercent: 0,
      progressConfidence: AiStreamProgressConfidence.ESTIMATED,
    };
    const { container } = render(
      <RuntimeBottleneckBreakdown stageTimings={null} metrics={emptyMetrics} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
