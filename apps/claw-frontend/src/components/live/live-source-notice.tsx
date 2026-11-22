import { Info } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { LiveCapability } from '@/enums/live.enum';
import type { LiveSourceNoticeProps } from '@/types/live.types';

/**
 * After the link is resolved: YouTube gets the honest "no AI analysis" notice (policy, watch only);
 * an HLS source asks for the viewer's own rights attestation before any processing.
 */
export function LiveSourceNotice({
  resolution,
  attestRights,
  onAttestChange,
  t,
}: LiveSourceNoticeProps): React.ReactElement {
  if (resolution.capability === LiveCapability.PLAYER_ONLY) {
    return (
      <div
        role="note"
        className="border-border bg-muted text-foreground flex gap-3 rounded-md border p-3"
        data-testid="live-youtube-notice"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{t('live.page.youtubeNoticeTitle')}</p>
          <p>{t('live.page.youtubeNotice')}</p>
          <p className="text-muted-foreground">{t('live.page.watchOnly')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3" data-testid="live-attest">
      <Checkbox
        id="live-attest"
        checked={attestRights}
        onCheckedChange={(checked) => onAttestChange(checked === true)}
        aria-describedby="live-attest-hint"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="live-attest" className="text-foreground text-sm font-medium">
          {t('live.page.attestLabel')}
        </label>
        <p id="live-attest-hint" className="text-muted-foreground text-xs">
          {t('live.page.attestHint')}
        </p>
      </div>
    </div>
  );
}
