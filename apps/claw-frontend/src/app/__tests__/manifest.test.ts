import { describe, expect, it } from 'vitest';

import manifest from '@/app/manifest';

describe('PWA manifest', () => {
  it('uses one valid purpose token per icon declaration', () => {
    const iconPurposes = manifest().icons?.map((icon) => icon.purpose);

    expect(iconPurposes).toContain('any');
    expect(iconPurposes).toContain('maskable');
    expect(iconPurposes).not.toContain('any maskable');
  });
});
