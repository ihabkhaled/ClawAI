import { PlatformAccessMethod, type ResearchPlatform } from '../../../generated/prisma';
import {
  PLATFORM_DOMAIN_LABEL_PATTERN,
  PLATFORM_DOMAIN_MAX_LENGTH,
  PLATFORM_DOMAIN_TLD_PATTERN,
} from '../constants/platform-admin.constants';

/** Whether a value is a bare lower-case host name (`reddit.com`, `bbc.co.uk`). */
export function isPlatformDomain(value: string): boolean {
  if (value.length < 3 || value.length > PLATFORM_DOMAIN_MAX_LENGTH) {
    return false;
  }
  const labels = value.split('.');
  const tld = labels.at(-1) ?? '';
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        PLATFORM_DOMAIN_LABEL_PATTERN.test(label) && !label.startsWith('-') && !label.endsWith('-'),
    ) &&
    PLATFORM_DOMAIN_TLD_PATTERN.test(tld)
  );
}

/**
 * Why a platform row is not usable, or null when it is: an OFFICIAL_API row
 * needs an `apiKind`; a SITE_SEARCH row needs at least one domain (its
 * `site:` scope) and no `apiKind`.
 */
export function platformShapeError(
  row: Pick<ResearchPlatform, 'accessMethod' | 'apiKind' | 'domains'>,
): string | null {
  if (row.accessMethod === PlatformAccessMethod.OFFICIAL_API && row.apiKind === null) {
    return 'An OFFICIAL_API platform needs an apiKind.';
  }
  if (row.accessMethod === PlatformAccessMethod.SITE_SEARCH) {
    if (row.apiKind !== null) {
      return 'A SITE_SEARCH platform has no apiKind.';
    }
    if (row.domains.length === 0) {
      return 'A SITE_SEARCH platform needs at least one domain.';
    }
  }
  return null;
}
