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
