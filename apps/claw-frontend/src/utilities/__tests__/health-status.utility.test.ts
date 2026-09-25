import { describe, expect, it } from 'vitest';

import { ServiceStatus } from '@/enums';
import { en } from '@/lib/i18n/locales/en';
import { untimedServiceLabelKey } from '@/utilities/health-status.utility';

describe('untimedServiceLabelKey', () => {
  // A scraper sidecar / ClamAV row is UP with responseTimeMs null: it is
  // operational, and must not be labelled "unreachable".
  it('labels an untimed UP row as operational', () => {
    expect(untimedServiceLabelKey(ServiceStatus.UP)).toBe('observability.status.states.up');
    expect(en.observability.status.states.up).toBe('Operational');
  });

  it('labels an untimed DOWN row as unreachable', () => {
    expect(untimedServiceLabelKey(ServiceStatus.DOWN)).toBe('dashboard.unreachable');
    expect(en.dashboard.unreachable).toBe('unreachable');
  });
});
