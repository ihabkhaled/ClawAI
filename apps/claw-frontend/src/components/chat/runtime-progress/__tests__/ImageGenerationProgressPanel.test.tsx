import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageGenerationProgressPanel } from '@/components/chat/runtime-progress/ImageGenerationProgressPanel';
import type { ClawRuntimeProgressEnvelope } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params
        ? `${key}|${Object.entries(params)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(',')}`
        : key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

const buildEnvelope = (
  overrides: Partial<ClawRuntimeProgressEnvelope> = {},
): ClawRuntimeProgressEnvelope => ({
  id: 'evt-1',
  runId: 'run-1',
  version: 'runtime-progress-v1',
  provider: 'STABLE_DIFFUSION_WEBUI',
  modality: 'IMAGE',
  eventType: 'STEP_PROGRESS',
  stage: 'GENERATING',
  sequence: 1,
  createdAtMs: Date.now(),
  rawProviderEventType: 'task(abc)',
  metrics: {
    startedAtMs: Date.now() - 1000,
    elapsedMs: 1000,
    currentStep: 4,
    totalSteps: 12,
    progressPercent: 33,
    samplingMs: 2500,
    progressConfidence: 'RUNTIME_REPORTED',
  },
  ...overrides,
});

describe('ImageGenerationProgressPanel', () => {
  it('renders step progress and ETA from the latest envelope', () => {
    render(<ImageGenerationProgressPanel progress={buildEnvelope()} />);
    expect(
      screen.getByText('runtimeProgress.image.stepProgress|current=4,total=12'),
    ).toBeInTheDocument();
    expect(screen.getByText('runtimeProgress.image.eta|seconds=2.5')).toBeInTheDocument();
    expect(screen.getByText('task(abc)')).toBeInTheDocument();
  });

  it('shows starting label when no envelope has arrived yet', () => {
    render(<ImageGenerationProgressPanel progress={null} />);
    expect(screen.getByText('runtimeProgress.image.starting')).toBeInTheDocument();
  });

  it('renders the interrupt button only when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<ImageGenerationProgressPanel progress={buildEnvelope()} onCancel={onCancel} />);
    const button = screen.getByLabelText('runtimeProgress.image.interrupt');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the interrupt button while cancelling', () => {
    const onCancel = vi.fn();
    render(
      <ImageGenerationProgressPanel
        progress={buildEnvelope()}
        onCancel={onCancel}
        isCancelling
      />,
    );
    const button = screen.getByLabelText('runtimeProgress.image.interrupt');
    expect(button).toBeDisabled();
  });

  it('omits the interrupt button when onCancel is undefined', () => {
    render(<ImageGenerationProgressPanel progress={buildEnvelope()} />);
    expect(screen.queryByLabelText('runtimeProgress.image.interrupt')).not.toBeInTheDocument();
  });

  it('renders a preview image when imagePreviewBase64 is set', () => {
    render(
      <ImageGenerationProgressPanel
        progress={buildEnvelope({ imagePreviewBase64: 'iVBORw0KGgoAAAANSUhEUg==' })}
        prompt="a cute robot"
      />,
    );
    const img = screen.getByAltText('a cute robot') as HTMLImageElement;
    expect(img.src).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
  });

  it('renders without ETA row when samplingMs is missing', () => {
    render(
      <ImageGenerationProgressPanel
        progress={buildEnvelope({
          metrics: {
            elapsedMs: 1000,
            currentStep: 4,
            totalSteps: 12,
            progressPercent: 33,
            progressConfidence: 'RUNTIME_REPORTED',
          },
        })}
      />,
    );
    expect(screen.queryByText(/runtimeProgress\.image\.eta/)).not.toBeInTheDocument();
  });
});
