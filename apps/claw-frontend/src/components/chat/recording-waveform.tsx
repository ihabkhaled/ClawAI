import type { ReactElement } from 'react';

import { RecordingWaveformVariant } from '@/enums/recording-waveform-variant.enum';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';
import type { RecordingWaveformProps } from '@/types';

/**
 * Live audio bars, driven by `useRecordingWaveform`'s levels — an SVG, not a
 * static mic icon, so a silent room and a loud voice visibly look different
 * while recording. Purely presentational: all the AnalyserNode plumbing lives
 * in the hook, per "TSX = components only".
 */
export function RecordingWaveform({
  levels,
  variant = RecordingWaveformVariant.Hero,
}: RecordingWaveformProps): ReactElement {
  const { t } = useTranslation();
  const isCompact = variant === RecordingWaveformVariant.Compact;
  const height = isCompact ? 28 : 96;
  const barWidth = isCompact ? 2 : 4;
  const gap = isCompact ? 2 : 3;
  const width = levels.length * (barWidth + gap);

  return (
    <svg
      role="img"
      aria-label={t('chat.recorder.waveformLabel')}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={isCompact ? undefined : '100%'}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      className={cn('shrink-0', isCompact ? 'h-7 w-auto' : 'h-24 w-full')}
      data-testid="recording-waveform"
    >
      {levels.map((level, index) => {
        const barHeight = Math.max(2, level * height);
        return (
          <rect
            // Bars are positional/stateless — index is the only stable key.
            key={index}
            x={index * (barWidth + gap)}
            y={(height - barHeight) / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className="fill-primary"
          />
        );
      })}
    </svg>
  );
}
