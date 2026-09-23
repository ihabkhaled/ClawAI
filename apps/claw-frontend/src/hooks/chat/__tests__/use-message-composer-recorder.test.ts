import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMessageComposer } from '@/hooks/chat/use-message-composer';
import type { MessageComposerProps } from '@/types';

const ingestFiles = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: () => ({ has: () => true }),
}));
vi.mock('@/hooks/ui/use-media-query', () => ({
  useMediaQuery: () => true,
}));
vi.mock('@/hooks/chat/use-model-media-capabilities', () => ({
  useModelMediaCapabilities: () => ({ canSendAudio: false, canSendVideo: true }),
}));
vi.mock('@/hooks/chat/use-message-composer-state', () => ({
  useMessageComposerState: () => ({
    content: '',
    validationError: null,
    selectedFileIds: [],
    setSelectedFileIds: vi.fn(),
    research: { mode: 'OFF' },
    setResearch: vi.fn(),
    researchProviders: [],
    isResearchProvidersLoading: false,
    ingestFiles,
    isUploadingAttachment: false,
    attachmentUploadProgress: null,
    handleValueChange: vi.fn(),
    submit: vi.fn(),
    handleSubmit: vi.fn(),
  }),
}));

const props: MessageComposerProps = {
  onSend: vi.fn(),
  isPending: false,
  selectedModel: null,
  onModelChange: vi.fn(),
};

describe('useMessageComposer — voice/video notes', () => {
  it('passes the model capabilities straight to the toolbar', () => {
    const { result } = renderHook(() => useMessageComposer(props));
    expect(result.current.toolbarProps.canSendAudio).toBe(false);
    expect(result.current.toolbarProps.canSendVideo).toBe(true);
  });

  it('sends a recorded note through the same ingestFiles pipeline as a picked file', () => {
    const { result } = renderHook(() => useMessageComposer(props));
    const file = new File(['bytes'], 'voice-note-x.webm', { type: 'audio/webm' });

    result.current.toolbarProps.onRecorded(file);

    expect(ingestFiles).toHaveBeenCalledWith([file]);
  });
});
