'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TTS_VOICE_DEFAULT_VALUE,
  TTS_VOICE_GROUPS,
  TTS_VOICE_SELECT_ID,
} from '@/constants/tts-voice.constants';
import { useTranslation } from '@/lib/i18n';
import type { TtsVoicePreferenceCardProps } from '@/types/tts-voice.types';

/**
 * The "Read aloud" voice. Voice names are the providers' own proper nouns and
 * are shown exactly as the APIs spell them; the headings and notes are
 * translated. A voice belongs to one provider: when the other provider reads
 * (a fallback), it uses its own default voice — the note says so.
 */
export function TtsVoicePreferenceCard({
  value,
  isPending,
  onChange,
}: TtsVoicePreferenceCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.ttsVoice')}</CardTitle>
        <CardDescription>{t('settings.ttsVoiceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <label htmlFor={TTS_VOICE_SELECT_ID} className="text-sm font-medium">
          {t('settings.ttsVoiceLabel')}
        </label>
        <Select value={value} onValueChange={onChange} disabled={isPending}>
          <SelectTrigger id={TTS_VOICE_SELECT_ID} className="w-full max-w-xs">
            <SelectValue placeholder={t('settings.ttsVoiceDefault')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TTS_VOICE_DEFAULT_VALUE}>{t('settings.ttsVoiceDefault')}</SelectItem>
            {TTS_VOICE_GROUPS.map((group) => (
              <SelectGroup key={group.provider}>
                <SelectSeparator />
                <SelectLabel>{t(group.labelKey)}</SelectLabel>
                {group.voices.map((voice) => (
                  <SelectItem key={voice} value={voice} lang="en" translate="no">
                    {voice}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{t('settings.ttsVoiceFallbackNote')}</p>
      </CardContent>
    </Card>
  );
}
