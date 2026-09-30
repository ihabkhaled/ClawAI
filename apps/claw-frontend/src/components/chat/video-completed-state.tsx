import { Download, ExternalLink } from 'lucide-react';

import { VIDEO_DOWNLOAD_FILENAME } from '@/constants/video.constants';
import { useTranslation } from '@/lib/i18n';
import type { VideoCompletedStateProps } from '@/types';

export function VideoCompletedState({
  blobUrl,
  prompt,
}: VideoCompletedStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="border-border w-full max-w-full rounded-xl border p-3">
      <video
        aria-label={prompt}
        className="max-h-[512px] w-full rounded-lg bg-black"
        controls
        data-testid="video-generation-player"
        playsInline
        preload="metadata"
        src={blobUrl}
      >
        {/* Generated clips ship without a caption file; the track keeps the
            element valid for assistive tech until providers return captions. */}
        <track kind="captions" />
      </video>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          className="hover:bg-muted touch:min-h-11 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
          download={VIDEO_DOWNLOAD_FILENAME}
          href={blobUrl}
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          {t('common.download')}
        </a>
        <a
          className="hover:bg-muted touch:min-h-11 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
          href={blobUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {t('chat.open')}
        </a>
      </div>
    </div>
  );
}
