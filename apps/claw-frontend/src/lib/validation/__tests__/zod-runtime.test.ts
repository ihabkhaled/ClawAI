import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ZOD_JITLESS_IN_BROWSER } from '@/lib/validation/zod-runtime';

describe('zod in the browser', () => {
  it('never probes Function() (a probe is a CSP violation under a policy without unsafe-eval)', () => {
    expect(ZOD_JITLESS_IN_BROWSER).toBe(true);
    const probe = vi.spyOn(globalThis, 'Function');
    const schema = z.object({ name: z.string(), count: z.number() });
    expect(schema.safeParse({ name: 'a', count: 1 }).success).toBe(true);
    expect(schema.safeParse({ name: 1 }).success).toBe(false);
    expect(probe).not.toHaveBeenCalled();
    probe.mockRestore();
  });
});
