import { describe, expect, it } from 'vitest';

// (portal)/layout.tsx transitively imports the full portal shell (sidebar,
// topbar, every hook), which is expensive to compile on first import —
// generous timeouts here are about cold-compile cost, not slow logic.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

describe('private route group metadata', () => {
  it(
    '(portal)/layout.tsx exports noindex robots metadata',
    async () => {
      const { metadata } = await import('@/app/(portal)/layout');
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    '(auth)/layout.tsx exports noindex robots metadata',
    async () => {
      const { metadata } = await import('@/app/(auth)/layout');
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'not-found.tsx exports noindex robots metadata',
    async () => {
      const { metadata } = await import('@/app/not-found');
      expect(metadata.robots).toMatchObject({ index: false });
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
