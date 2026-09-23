import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecordingWaveform } from '@/components/chat/recording-waveform';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('RecordingWaveform', () => {
  it('renders one bar per level — a live readout, not a static icon', () => {
    const { container } = render(<RecordingWaveform levels={[0.1, 0.5, 1, 0.2]} />);
    expect(container.querySelectorAll('rect')).toHaveLength(4);
  });

  it('re-renders taller bars when levels rise, proving it tracks live data', () => {
    const { container, rerender } = render(<RecordingWaveform levels={[0.1, 0.1]} />);
    const initialHeights = Array.from(container.querySelectorAll('rect')).map((rect) =>
      Number(rect.getAttribute('height')),
    );

    rerender(<RecordingWaveform levels={[0.9, 0.9]} />);
    const nextHeights = Array.from(container.querySelectorAll('rect')).map((rect) =>
      Number(rect.getAttribute('height')),
    );

    for (const [index, height] of nextHeights.entries()) {
      expect(height).toBeGreaterThan(initialHeights[index] ?? 0);
    }
  });

  it('is labeled as a live audio level for assistive tech', () => {
    render(<RecordingWaveform levels={[0.5]} />);
    expect(screen.getByRole('img', { name: 'chat.recorder.waveformLabel' })).toBeInTheDocument();
  });
});
