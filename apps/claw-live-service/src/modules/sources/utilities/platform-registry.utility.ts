import { ServerPullProbe } from '../../../common/enums/live-server-pull-probe.enum';
import { LiveSourceReasonCode } from '../../../common/enums/live-source-reason-code.enum';
import { LiveCapability } from '../../../generated/prisma';
import { LIVE_PLATFORM_REGISTRY } from '../constants/platform-registry.constants';
import type { PlatformDefinition, PlatformResolution } from '../types/platform.types';

/** The first registry row whose parser accepts the URL, with what it parsed; null otherwise. */
export function resolvePlatformUrl(
  url: URL,
  registry: readonly PlatformDefinition[] = LIVE_PLATFORM_REGISTRY,
): PlatformResolution | null {
  for (const definition of registry) {
    const match = definition.parse(url);
    if (match) return { definition, match };
  }
  return null;
}

/** The honest reason shown for a resolved platform stream. */
export function platformReasonCode(
  capability: LiveCapability,
  probe: ServerPullProbe,
): LiveSourceReasonCode {
  if (capability === LiveCapability.SERVER_PULL) return LiveSourceReasonCode.SERVER_PULL_AVAILABLE;
  if (capability !== LiveCapability.BROWSER_CAPTURE) return LiveSourceReasonCode.LINK_ONLY_PLATFORM;
  return probe === ServerPullProbe.UNREACHABLE
    ? LiveSourceReasonCode.SERVER_PULL_UNAVAILABLE
    : LiveSourceReasonCode.BROWSER_CAPTURE_AVAILABLE;
}
