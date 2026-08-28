import { describe, expect, it } from 'vitest';

import { buildGaBootstrapScript, buildGtmBootstrapScript } from '@/utilities/analytics.utility';

describe('buildGtmBootstrapScript', () => {
  it('stamps gtm.start, which is the origin of every later measurement', () => {
    const script = buildGtmBootstrapScript('GTM-PPCVCPGM');

    expect(script).toContain("'gtm.start'");
    expect(script).toContain('new Date().getTime()');
  });

  it('loads the container from googletagmanager and carries the id', () => {
    const script = buildGtmBootstrapScript('GTM-PPCVCPGM');

    expect(script).toContain('https://www.googletagmanager.com/gtm.js');
    expect(script).toContain('GTM-PPCVCPGM');
  });

  it('pushes onto dataLayer, the queue the container drains on arrival', () => {
    expect(buildGtmBootstrapScript('GTM-PPCVCPGM')).toContain('dataLayer');
  });
});

describe('buildGaBootstrapScript', () => {
  it('defines gtag and configures the property before the loader arrives', () => {
    const script = buildGaBootstrapScript('G-ABCD1234');

    expect(script).toContain('function gtag()');
    expect(script).toContain("gtag('config','G-ABCD1234')");
  });
});
