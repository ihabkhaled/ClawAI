import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { ResearchMode } from '@/enums';

// The compare panel mounts FileAttachmentPicker, which transitively calls
// useTranslation() (LocaleProvider-backed) plus useFiles(). Upload itself is
// the `onIngestFiles` prop in baseProps below, not a hook FileAttachmentPicker
// opens on its own — see use-file-attachment-picker.ts.
// In this unit test we don't render a LocaleProvider, so mock those modules.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/files/use-files', () => ({
  useFiles: () => ({ files: [], isLoading: false, isError: false, error: null }),
}));

// The recorder's capability gate reads the connector catalog. Two rows: one
// that can take neither medium, one that can take both.
vi.mock('@/hooks/chat/use-available-connector-models', () => ({
  useAvailableConnectorModels: () => ({
    models: [
      {
        provider: 'OPENAI',
        modelKey: 'text-only',
        supportsAudio: false,
        supportsVision: false,
      },
      {
        provider: 'GEMINI',
        modelKey: 'multimodal',
        supportsAudio: true,
        supportsVision: true,
      },
    ],
    isLoading: false,
  }),
}));

const t = (key: string): string => key;

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  selectedModels: [],
  onToggleModel: vi.fn(),
  prompt: '',
  onPromptChange: vi.fn(),
  onSend: vi.fn(),
  result: undefined,
  isPending: false,
  canSend: false,
  judgeEnabled: false,
  onJudgeEnabledChange: vi.fn(),
  judgeModel: null,
  onJudgeModelChange: vi.fn(),
  judgeModelOptions: [],
  judgeModelOptionsLoading: false,
  criticEnabled: false,
  onCriticEnabledChange: vi.fn(),
  criticModel: null,
  onCriticModelChange: vi.fn(),
  allowCriticReview: false,
  research: { mode: ResearchMode.AUTO },
  onResearchChange: vi.fn(),
  researchProviders: [],
  isResearchProvidersLoading: false,
  selectedFileIds: [],
  onSelectedFileIdsChange: vi.fn(),
  onIngestFiles: vi.fn(),
  attachmentTray: { fileIds: [], pendingUploads: [], progress: null, onRemove: vi.fn() },
  t,
};

function withQueryClient(children: ReactNode): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('InThreadComparePanel — plan-feature gates', () => {
  it('hides judge controls when allowJudgeMode is false', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode={false} allowResearchMode />,
      ),
    );
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
  });

  it('hides research controls when allowResearchMode is false', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode={false} />,
      ),
    );
    expect(screen.queryByLabelText('research.toggle.modeLabel')).not.toBeInTheDocument();
  });

  it('shows both judge + research controls when plan unlocks both', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    expect(screen.getByText('chat.judgeReferee')).toBeInTheDocument();
    expect(screen.getByLabelText('research.toggle.modeLabel')).toBeInTheDocument();
  });

  it('hides BOTH judge + research controls when plan locks both', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode={false} allowResearchMode={false} />,
      ),
    );
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('research.toggle.modeLabel')).not.toBeInTheDocument();
  });

  it('hides Critic controls when allowCriticReview is false even with judge enabled', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled
          allowCriticReview={false}
        />,
      ),
    );
    expect(screen.queryByText('compare.critic.enabled')).not.toBeInTheDocument();
  });

  it('hides Critic controls when allowCriticReview=true but judge is off (UI rule)', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled={false}
          allowCriticReview
        />,
      ),
    );
    expect(screen.queryByText('compare.critic.enabled')).not.toBeInTheDocument();
  });

  it('shows Critic controls when allowCriticReview AND judgeEnabled are both true', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled
          allowCriticReview
        />,
      ),
    );
    expect(screen.getByText('compare.critic.enabled')).toBeInTheDocument();
  });
});

describe('InThreadComparePanel — drop-zone scope', () => {
  // Reversed 2026-09-25 by the owner: "drag and drop files into the WHOLE
  // chat panel, not only the text area". The dialog body — models, controls,
  // prompt — is one drop target now, the way ChatGPT and Claude behave.
  it('makes the whole dialog body the drop target, prompt and controls included', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    const dropzone = screen.getByTestId('in-thread-compare-dropzone');
    expect(dropzone.contains(screen.getByLabelText('compare.sendPrompt'))).toBe(true);
    expect(dropzone.contains(screen.getByTestId('voice-video-recorder-audio'))).toBe(true);
  });

  // Live 2026-09-25: the fixed-width research selects ended 4px past the
  // dialog edge in the ~350px column. They must sit in a width-bounded,
  // sideways-scrolling wrapper.
  it('bounds the research toggle to the column width', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    const wrapper = screen.getByTestId('in-thread-compare-research');
    expect(wrapper.className).toContain('max-w-full');
    expect(wrapper.className).toContain('min-w-0');
    expect(wrapper.className).toContain('overflow-x-auto');
  });
});

describe('InThreadComparePanel — prompt textarea parity', () => {
  it('stacks the prompt and submit action on narrow screens', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );

    const submit = screen.getByRole('button', { name: 'compare.sendPrompt' });
    expect(submit).toHaveClass('w-full', 'sm:w-auto');
    expect(submit.closest('form')).toHaveClass('flex-col', 'sm:flex-row', 'min-w-0');
  });

  it('typing into the prompt textarea calls onPromptChange with the new value', () => {
    const onPromptChange = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt=""
          onPromptChange={onPromptChange}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.change(textarea, { target: { value: 'hello compare' } });
    expect(onPromptChange).toHaveBeenCalledWith('hello compare');
  });

  it('pressing Enter on the prompt textarea triggers onSend (with non-empty value, not pending)', () => {
    const onSend = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt="please compare these"
          canSend
          isPending={false}
          onSend={onSend}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('Shift+Enter does NOT trigger onSend (falls through to newline)', () => {
    const onSend = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt="please compare these"
          canSend
          isPending={false}
          onSend={onSend}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });
});

// The recorder dims itself when the BROWSER cannot record, which in jsdom is
// always — stub MediaRecorder so the capability gate is the only thing under
// test here. Same stub the orchestration shell recorder test uses.
class MockMediaRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: unknown) {}
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['bytes'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

describe('InThreadComparePanel — voice/video recorder', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          const tracks = [{ stop: vi.fn() }];
          return {
            getTracks: () => tracks,
            getAudioTracks: () => tracks,
            getVideoTracks: () => tracks,
          } as unknown as MediaStream;
        }),
      },
    });
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
  });

  it('renders both recorder triggers', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeInTheDocument();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeInTheDocument();
  });

  it('stays enabled when ONE of several selected models supports the medium', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          selectedModels={[
            { provider: 'OPENAI', model: 'text-only' },
            { provider: 'GEMINI', model: 'multimodal' },
          ]}
        />,
      ),
    );
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeEnabled();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeEnabled();
  });

  // Batch 10: the recorder no longer asks the selected lanes. A text-only lane
  // still gets a voice note (transcribed out of band) and a video (frames +
  // transcript), so both triggers stay live while the catalog can transcribe
  // and the plan allows video.
  it('keeps both triggers live for a text-only lane when transcription exists', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          selectedModels={[{ provider: 'OPENAI', model: 'text-only' }]}
        />,
      ),
    );
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeEnabled();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeEnabled();
  });

  it('opens the consent dialog — it ships inside the recorder, not the panel', async () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    expect(await screen.findByTestId('media-recording-consent-confirm')).toBeInTheDocument();
  });

  it('hands a finished recording to onIngestFiles', async () => {
    const onIngestFiles = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          onIngestFiles={onIngestFiles}
        />,
      ),
    );
    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    fireEvent.click(await screen.findByTestId('media-recording-consent-confirm'));
    await waitFor(() => {
      expect(screen.getByTestId('recording-surface-stop')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('recording-surface-stop'));
    await waitFor(() => {
      expect(onIngestFiles).toHaveBeenCalledTimes(1);
    });
    const [files] = onIngestFiles.mock.calls[0] as [File[]];
    expect(files[0]).toBeInstanceOf(File);
  });
});
