import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeProgressPanel } from '@/components/chat/runtime-progress';
import { StreamEventType, VisibleProgressActorType, VisibleProgressStageStatus } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('RuntimeProgressPanel', () => {
  it('renders the visible-AI-progress timeline when stages are supplied', () => {
    render(
      <RuntimeProgressPanel
        currentStageLabel="Evidence ready"
        progressStages={[
          {
            id: 'request:accepted',
            type: StreamEventType.REQUEST_ACCEPTED,
            label: 'Request accepted',
            actorType: VisibleProgressActorType.REQUEST,
            actorName: 'Claw',
            status: VisibleProgressStageStatus.COMPLETED,
            timestamp: Date.now(),
          },
          {
            id: 'research:evidence',
            type: StreamEventType.RESEARCH_COMPLETED,
            label: 'Evidence ready',
            description: 'Collected 6 evidence items using search and scrape.',
            actorType: VisibleProgressActorType.TOOL,
            actorName: 'Research workflow',
            status: VisibleProgressStageStatus.COMPLETED,
            timestamp: Date.now(),
          },
        ]}
      />,
    );

    expect(screen.getByText('chat.visibleAiProgress')).toBeInTheDocument();
    expect(screen.getAllByText('Evidence ready').length).toBeGreaterThan(0);
    expect(screen.getByText('Research workflow')).toBeInTheDocument();
    expect(screen.getByLabelText('chat.currentAiProgress')).toBeInTheDocument();
  });

  it('falls back to the generic thinking label when no stage / model is provided', () => {
    render(<RuntimeProgressPanel />);
    // THINKING_INDICATOR_LABEL constant value lives in chat.constants.ts.
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('surfaces stream errors instead of the live block', () => {
    render(<RuntimeProgressPanel streamError="boom" />);
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('chat.visibleAiProgress')).not.toBeInTheDocument();
  });

  it('renders fallback-attempt rows when supplied', () => {
    render(
      <RuntimeProgressPanel
        fallbackAttempts={[
          {
            failedProvider: 'OPENAI',
            failedModel: 'gpt-4o-mini',
            error: 'timeout',
            attempt: 1,
            totalCandidates: 2,
            nextProvider: 'ANTHROPIC',
            nextModel: 'claude-sonnet-4',
            timestamp: Date.now(),
          },
        ]}
      />,
    );
    expect(screen.getByText(/OPENAI\/gpt-4o-mini/)).toBeInTheDocument();
    expect(screen.getByText('chat.tryingFallback')).toBeInTheDocument();
  });
});
