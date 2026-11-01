import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompareResultCard } from '@/components/chat/compare-result-card';
import { ParallelModelStatus } from '@/enums';
import type { ParallelModelResponse } from '@/types';

vi.mock('@/components/chat/video-generation-bubble', () => ({
  VideoGenerationBubble: ({ generationId }: { generationId: string }) => (
    <div data-testid={`video-${generationId}`} />
  ),
}));
vi.mock('@/components/chat/image-generation-bubble', () => ({
  ImageGenerationBubble: ({ generationId }: { generationId: string }) => (
    <div data-testid={`image-${generationId}`} />
  ),
}));
vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));

const lane = (extra: Partial<ParallelModelResponse>): ParallelModelResponse => ({
  provider: 'GROK',
  model: 'grok-4',
  content: 'Here is your clip.',
  latencyMs: 10,
  inputTokens: 1,
  outputTokens: 1,
  status: ParallelModelStatus.COMPLETED,
  errorMessage: null,
  ...extra,
});

describe('CompareResultCard media', () => {
  it('renders the video and image cards a lane made with a media tool', () => {
    render(
      <CompareResultCard
        response={lane({
          mediaGenerations: [
            { kind: 'video', id: 'v1', prompt: 'waves' },
            { kind: 'image', id: 'i1', prompt: 'fox' },
          ],
        })}
        isFastest={false}
        isBest={false}
        t={(key: string) => key}
      />,
    );
    expect(screen.getByTestId('video-v1')).toBeTruthy();
    expect(screen.getByTestId('image-i1')).toBeTruthy();
  });

  it('renders no card for a lane that made none', () => {
    render(
      <CompareResultCard
        response={lane({})}
        isFastest={false}
        isBest={false}
        t={(key: string) => key}
      />,
    );
    expect(screen.queryByTestId('media-generation-cards')).toBeNull();
  });
});
