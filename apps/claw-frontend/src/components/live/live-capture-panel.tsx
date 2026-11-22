import { AudioLines, Square } from 'lucide-react';

import { LiveCaptureConsentDialog } from '@/components/live/live-capture-consent-dialog';
import { Button } from '@/components/ui/button';
import { LIVE_CAPTURE_ERROR_KEYS } from '@/constants/live.constants';
import { LiveCaptureState } from '@/enums/live.enum';
import type { LiveCapturePanelProps } from '@/types/live.types';

/** "Analyze with my browser" under a browser-capture player: start (after consent), progress, stop, errors. */
export function LiveCapturePanel({ capture, t }: LiveCapturePanelProps): React.ReactElement {
  const { state } = capture;
  return (
    <div
      className="border-border flex flex-col gap-2 rounded-md border p-3"
      data-testid={`live-capture-${state}`}
    >
      {state === LiveCaptureState.CAPTURING ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-foreground flex items-center gap-2 text-sm font-medium">
            <AudioLines className="h-4 w-4" aria-hidden="true" />
            {t('live.capture.capturing')}
          </p>
          <Button variant="outline" size="sm" onClick={capture.stop}>
            <Square className="h-4 w-4" aria-hidden="true" />
            {t('live.capture.stop')}
          </Button>
        </div>
      ) : (
        <Button
          className="self-start"
          onClick={capture.openConsent}
          isLoading={state === LiveCaptureState.REQUESTING}
          disabled={state === LiveCaptureState.REQUESTING}
        >
          <AudioLines className="h-4 w-4" aria-hidden="true" />
          {t('live.capture.analyze')}
        </Button>
      )}
      {state === LiveCaptureState.REQUESTING ? (
        <p className="text-muted-foreground text-sm">{t('live.capture.requesting')}</p>
      ) : null}
      {state === LiveCaptureState.STOPPED ? (
        <p className="text-muted-foreground text-sm">{t('live.capture.stopped')}</p>
      ) : null}
      {capture.error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {t(LIVE_CAPTURE_ERROR_KEYS[capture.error])}
        </p>
      )}
      <LiveCaptureConsentDialog
        open={capture.consentOpen}
        onCancel={capture.closeConsent}
        onConfirm={capture.confirm}
        t={t}
      />
    </div>
  );
}
