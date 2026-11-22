import { LiveNoticeBox } from '@/components/live/live-notice-box';
import { Checkbox } from '@/components/ui/checkbox';
import { LiveCapability } from '@/enums/live.enum';
import type { LiveSourceNoticeProps } from '@/types/live.types';
import { livePlatformName } from '@/utilities/live-embed.utility';

/**
 * After the link is resolved: a browser-capture platform (YouTube, Twitch, Kick, Facebook) says AI
 * runs from the viewer's own tab; a link-only platform says it opens on the platform; a player-only
 * source says it gets no AI; an HLS source asks for the viewer's own rights attestation.
 */
export function LiveSourceNotice({
  resolution,
  attestRights,
  onAttestChange,
  t,
}: LiveSourceNoticeProps): React.ReactElement {
  const platform = livePlatformName(resolution.platform) ?? '';
  const recognised = platform === '' ? [] : [t('live.platform.recognised', { platform })];
  if (resolution.capability === LiveCapability.BROWSER_CAPTURE) {
    return (
      <LiveNoticeBox
        testId="live-capture-notice"
        title={t('live.platform.captureTitle')}
        lines={[...recognised, t('live.platform.captureNotice', { platform })]}
      />
    );
  }
  if (resolution.capability === LiveCapability.LINK_ONLY) {
    return (
      <LiveNoticeBox
        testId="live-link-only-notice"
        title={t('live.platform.linkOnlyTitle', { platform })}
        lines={[...recognised, t('live.platform.linkOnlyNotice', { platform })]}
      />
    );
  }
  if (resolution.capability === LiveCapability.PLAYER_ONLY) {
    return (
      <LiveNoticeBox
        testId="live-player-only-notice"
        title={t('live.platform.playerOnlyTitle')}
        lines={[...recognised, t('live.platform.playerOnly'), t('live.page.watchOnly')]}
      />
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
