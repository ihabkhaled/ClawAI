import { LiveNoticeBox } from '@/components/live/live-notice-box';
import { Checkbox } from '@/components/ui/checkbox';
import { LIVE_SERVER_PULL_UNAVAILABLE_REASON } from '@/constants/live.constants';
import { LiveCapability, LiveCaptureSource } from '@/enums/live.enum';
import { useLiveCaptureSource } from '@/hooks/live/use-live-capture-source';
import type { LiveSourceNoticeProps } from '@/types/live.types';
import { livePlatformName } from '@/utilities/live-embed.utility';

/**
 * After the link is resolved: a server-pull stream (any platform but Discord, with or without an
 * embeddable player) says AI runs on ClawAI's servers (any device); a recorded video says the
 * server plays it along from the start;
 * a browser-capture platform (YouTube, Twitch, Kick, Facebook) says AI runs from the viewer's own
 * device (through the microphone on a phone), and why when server pull was tried and failed; a link-only platform says it opens on the platform; a player-only
 * source says it gets no AI; an HLS source asks for the viewer's own rights attestation.
 */
export function LiveSourceNotice({
  resolution,
  attestRights,
  onAttestChange,
  t,
}: LiveSourceNoticeProps): React.ReactElement {
  const captureSource = useLiveCaptureSource();
  const platform = livePlatformName(resolution.platform) ?? '';
  const recognised = platform === '' ? [] : [t('live.platform.recognised', { platform })];
  if (resolution.capability === LiveCapability.SERVER_PULL) {
    return (
      <LiveNoticeBox
        testId="live-server-pull-notice"
        title={t('live.platform.serverPullTitle')}
        lines={[...recognised, t('live.platform.serverPullNotice')]}
      />
    );
  }
  if (resolution.capability === LiveCapability.RECORDED) {
    return (
      <LiveNoticeBox
        testId="live-recorded-notice"
        title={t('live.platform.recordedTitle')}
        lines={[...recognised, t('live.platform.recordedNotice')]}
      />
    );
  }
  if (resolution.capability === LiveCapability.BROWSER_CAPTURE) {
    const fallback =
      resolution.reasonCode === LIVE_SERVER_PULL_UNAVAILABLE_REASON
        ? [t('live.platform.serverPullUnavailable')]
        : [];
    const captureNoticeKey =
      captureSource === LiveCaptureSource.MICROPHONE
        ? 'live.platform.captureNoticeMic'
        : 'live.platform.captureNotice';
    return (
      <LiveNoticeBox
        testId="live-capture-notice"
        title={t('live.platform.captureTitle')}
        lines={[...recognised, ...fallback, t(captureNoticeKey, { platform })]}
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
