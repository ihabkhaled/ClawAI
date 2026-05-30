import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeStageTimeline } from '@/components/chat/runtime-progress';
import { AiStreamStage } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('RuntimeStageTimeline', () => {
  it('returns null when stageTimings is null or undefined', () => {
    const { container } = render(<RuntimeStageTimeline stageTimings={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when stageTimings is an empty object', () => {
    const { container } = render(<RuntimeStageTimeline stageTimings={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one row per stage with the active stage marked as active', () => {
    const timings = {
      [AiStreamStage.CONNECTING_PROVIDER]: { startedAtMs: 1000, endedAtMs: 1200 },
      [AiStreamStage.WAITING_FIRST_TOKEN]: { startedAtMs: 1200, endedAtMs: 1500 },
      [AiStreamStage.GENERATING]: { startedAtMs: 1500, endedAtMs: 3500 },
    };
    render(<RuntimeStageTimeline stageTimings={timings} activeStage={AiStreamStage.GENERATING} />);

    // Stage labels should appear (the stage key is the raw enum value)
    expect(screen.getByText(AiStreamStage.CONNECTING_PROVIDER)).toBeInTheDocument();
    expect(screen.getByText(AiStreamStage.WAITING_FIRST_TOKEN)).toBeInTheDocument();
    expect(screen.getByText(AiStreamStage.GENERATING)).toBeInTheDocument();

    // Active row gets data-status=active
    const activeRow = screen.getByText(AiStreamStage.GENERATING).closest('li');
    expect(activeRow?.dataset['status']).toBe('active');
  });

  it('marks rows without endedAtMs as active too (running stage)', () => {
    const timings = {
      [AiStreamStage.GENERATING]: { startedAtMs: 1000 },
    };
    render(<RuntimeStageTimeline stageTimings={timings} />);
    const row = screen.getByText(AiStreamStage.GENERATING).closest('li');
    expect(row?.dataset['status']).toBe('active');
  });
});
