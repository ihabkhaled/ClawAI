import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UploadProgressIndicator } from '@/components/files/upload-progress-indicator';
import type { UploadProgressSnapshot } from '@/types';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}));

function snapshot(overrides: Partial<UploadProgressSnapshot> = {}): UploadProgressSnapshot {
  return {
    percent: 40,
    bytesUploaded: 4_000_000,
    totalBytes: 10_000_000,
    bytesPerSecond: 1_000_000,
    etaSeconds: 6,
    elapsedSeconds: 4,
    ...overrides,
  };
}

describe('UploadProgressIndicator', () => {
  it('reflects percent on the progressbar', () => {
    render(<UploadProgressIndicator progress={snapshot({ percent: 62 })} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  });

  it('announces percent, ETA, speed and elapsed via aria-live text, not visuals only', () => {
    render(<UploadProgressIndicator progress={snapshot()} />);
    const text = screen.getByTestId('upload-progress-text');
    expect(text).toHaveAttribute('aria-live', 'polite');
    expect(text.textContent).toContain('files.uploadProgress.percentLabel');
    expect(text.textContent).toContain('files.uploadProgress.etaLabel');
    expect(text.textContent).toContain('files.uploadProgress.speedLabel');
    expect(text.textContent).toContain('files.uploadProgress.elapsedLabel');
  });

  it('shows the "calculating" copy when ETA is not yet known', () => {
    render(<UploadProgressIndicator progress={snapshot({ etaSeconds: null })} />);
    expect(screen.getByTestId('upload-progress-text').textContent).toContain(
      'files.uploadProgress.etaUnknown',
    );
  });
});
