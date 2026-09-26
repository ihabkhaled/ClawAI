import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TtsVoicePreferenceCard } from '@/components/settings/tts-voice-preference-card';
import { TTS_VOICE_DEFAULT_VALUE } from '@/constants/tts-voice.constants';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('TtsVoicePreferenceCard', () => {
  it('labels the picker for assistive tech and shows the default choice', () => {
    render(
      <TtsVoicePreferenceCard
        value={TTS_VOICE_DEFAULT_VALUE}
        isPending={false}
        onChange={vi.fn()}
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'settings.ttsVoiceLabel' });
    expect(combobox).toHaveTextContent('settings.ttsVoiceDefault');
    expect(screen.getByText('settings.ttsVoiceFallbackNote')).toBeInTheDocument();
  });

  it('lists both providers under translated headings, with voice names as-is', () => {
    render(
      <TtsVoicePreferenceCard
        value={TTS_VOICE_DEFAULT_VALUE}
        isPending={false}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('settings.ttsVoiceGroupGemini')).toBeInTheDocument();
    expect(screen.getByText('settings.ttsVoiceGroupOpenAi')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Zubenelgenubi' })).toHaveAttribute(
      'translate',
      'no',
    );
    expect(screen.getByRole('option', { name: 'shimmer' })).toBeInTheDocument();
  });

  it('emits the picked voice', () => {
    const onChange = vi.fn();
    render(<TtsVoicePreferenceCard value="Kore" isPending={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'nova' }));
    expect(onChange).toHaveBeenCalledWith('nova');
  });

  it('is disabled while a preference is being saved', () => {
    render(<TtsVoicePreferenceCard value="Kore" isPending onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
