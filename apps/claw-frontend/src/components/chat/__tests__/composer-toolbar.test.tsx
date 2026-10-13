import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerToolbar } from '@/components/chat/composer-toolbar';
import { ComposerControlVariant } from '@/enums';
import { ResearchMode } from '@/enums/research-mode.enum';
import type { ComposerToolbarProps } from '@/types';

vi.mock('@/components/chat/composer-plus-menu', () => ({
  ComposerPlusMenu: () => <div data-testid="plus-menu" />,
}));
vi.mock('@/components/chat/composer-research-chip', () => ({
  ComposerResearchChip: () => <div data-testid="research-chip" />,
}));
vi.mock('@/components/chat/model-selector', () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
}));
vi.mock('@/components/chat/voice-video-recorder', () => ({
  VoiceVideoRecorder: () => <div data-testid="recorder" />,
}));
vi.mock('@/components/chat/credit-indicator', () => ({
  CreditIndicator: () => <div data-testid="credit" />,
}));

const props = (overrides: Partial<ComposerToolbarProps> = {}): ComposerToolbarProps => ({
  selectedModel: null,
  onModelChange: vi.fn(),
  disabled: false,
  controlVariant: ComposerControlVariant.Default,
  showModelLabel: true,
  selectedFileIds: [],
  onSelectedFileIdsChange: vi.fn(),
  ingestFiles: vi.fn(),
  isUploadingAttachment: false,
  onRecorded: vi.fn(),
  canSendAudio: true,
  canSendVideo: true,
  canResearch: true,
  research: { mode: ResearchMode.AUTO },
  onResearchChange: vi.fn(),
  researchProviders: [],
  isResearchProvidersLoading: false,
  threadId: 't1',
  draft: '',
  showCredit: true,
  onInsertPrompt: vi.fn(),
  ...overrides,
});

describe('ComposerToolbar', () => {
  it('lays the row out as plus, model, research chip, recorder, credit', () => {
    render(<ComposerToolbar {...props()} />);

    const ids = ['plus-menu', 'model-selector', 'research-chip', 'recorder', 'credit'];
    const rendered = screen
      .getAllByTestId(/.*/u)
      .map((element) => element.getAttribute('data-testid'));

    expect(rendered).toEqual(ids);
  });

  it('shows the research chip only while research is on and the plan allows it', () => {
    const { rerender } = render(
      <ComposerToolbar {...props({ research: { mode: ResearchMode.NONE } })} />,
    );
    expect(screen.queryByTestId('research-chip')).toBeNull();

    rerender(<ComposerToolbar {...props({ canResearch: false })} />);
    expect(screen.queryByTestId('research-chip')).toBeNull();
  });

  it('hides the credit badge when the account is not metered', () => {
    render(<ComposerToolbar {...props({ showCredit: false })} />);

    expect(screen.queryByTestId('credit')).toBeNull();
  });
});
