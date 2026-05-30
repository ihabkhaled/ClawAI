import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeMetricsHud } from '@/components/chat/runtime-progress';
import { AiStreamProgressConfidence, ExecutionProfile } from '@/enums';
import type { StreamMetrics, StreamUsage } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

const baseMetrics: StreamMetrics = {
  elapsedMs: 4_200,
  timeToFirstTokenMs: 900,
  tokensPerSecond: 38.5,
  generatedTokens: 162,
  progressPercent: 56,
  progressConfidence: AiStreamProgressConfidence.ESTIMATED,
};

const baseUsage: StreamUsage = {
  promptTokens: 200,
  completionTokens: 162,
  totalTokens: 362,
  costAvailable: false,
};

describe('RuntimeMetricsHud', () => {
  it('returns null when no metrics or usage are provided', () => {
    const { container } = render(<RuntimeMetricsHud metrics={null} usage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders elapsed, TTFT, throughput, tokens, and cost-unavailable for cloud streams', () => {
    render(<RuntimeMetricsHud metrics={baseMetrics} usage={baseUsage} />);
    // Throughput is rendered as "tok/s" via formatTokensPerSecond
    expect(screen.getByText(/\/s$/)).toBeInTheDocument();
    // TTFT and elapsed both go through formatElapsed → "0.9s" / "4.2s"
    expect(screen.getByText(/chat\.stream\.ttft/)).toBeInTheDocument();
    expect(screen.getByText('chat.stream.costUnavailable')).toBeInTheDocument();
  });

  it('renders the execution-profile badge when supplied', () => {
    render(
      <RuntimeMetricsHud
        metrics={baseMetrics}
        usage={baseUsage}
        executionProfile={ExecutionProfile.CUDA}
      />,
    );
    expect(screen.getByText('runtimeProgress.metrics.executionProfile.cuda')).toBeInTheDocument();
  });

  it('hides the execution-profile badge when not supplied', () => {
    render(<RuntimeMetricsHud metrics={baseMetrics} usage={baseUsage} />);
    expect(
      screen.queryByText('runtimeProgress.metrics.executionProfile.cuda'),
    ).not.toBeInTheDocument();
  });
});
