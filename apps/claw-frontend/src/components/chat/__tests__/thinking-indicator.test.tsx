import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { StreamEventType, VisibleProgressActorType, VisibleProgressStageStatus } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('ThinkingIndicator', () => {
  it('renders an explicit visible AI progress timeline instead of only generic thinking dots', () => {
    render(
      <ThinkingIndicator
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
});
