import type { PlatformApiKind } from '../../../generated/prisma';
import type {
  PlatformApiContext,
  PlatformApiHit,
  PlatformApiRequest,
} from '../types/platform.types';

/**
 * One free official API (research engine B3). Stateless; every request goes
 * through `platformApiGet` (fixed host allow-list, SSRF guard, one deadline,
 * size cap, metering hook). `parse` is pure so it can be tested on fixtures.
 */
export interface PlatformApiAdapter {
  readonly kind: PlatformApiKind;

  search(request: PlatformApiRequest, context: PlatformApiContext): Promise<PlatformApiHit[]>;

  /** Hits from a raw response body, at most `maxResults`; malformed fields are skipped. */
  parse(body: string, maxResults: number, language?: string): PlatformApiHit[];
}
