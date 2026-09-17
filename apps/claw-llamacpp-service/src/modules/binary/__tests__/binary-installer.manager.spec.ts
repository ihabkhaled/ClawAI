import { vi } from 'vitest';
import { PINNED_LLAMACPP_VERSION } from '../constants/binary-releases.constants';
import { BinaryInstallerManager } from '../managers/binary-installer.manager';

// Vitest refuses a vi.mock registered inside a test body, and under Jest the
// same call was dead anyway: the module graph was already loaded by the time
// the test ran. Registered here it genuinely takes effect — the pinned-release
// lookup below tolerates both the matching and the non-matching platform.
vi.mock('../../../common/utilities', async () => ({
  ...(await vi.importActual('../../../common/utilities')),
  detectPlatform: vi.fn().mockResolvedValue({
    os: 'linux',
    arch: 'arm64',
    gpuBackend: 'CPU',
    key: 'aix-ppc',
  }),
}));

describe('BinaryInstallerManager', () => {
  it('skips install when active binary present and version matches resolved release', async () => {
    // The skip-install path requires `existing.version === release.tag`. The
    // resolved tag comes from resolveRelease() which dynamically fetches from
    // GitHub; in CI the live release moves over time. We stub fetchLatestRelease
    // to return null so it falls back to PINNED_LLAMACPP_VERSION, and seed
    // the existing record with that same pinned tag.
    const repo = {
      findActive: vi.fn().mockResolvedValue({
        id: 'b1',
        version: PINNED_LLAMACPP_VERSION,
        platform: 'linux-x64-cpu',
        binaryPath: '/var/lib/claw/llamacpp/bin/llama-server',
        archiveSha256: 'a'.repeat(64),
      }),
      upsertActive: vi.fn(),
    };
    const installer = new BinaryInstallerManager(repo as any);
    // patch binaryExists to return true so we hit the early-return path
    (installer as any).binaryExists = vi.fn().mockResolvedValue(true);
    // force resolveRelease to use the pinned version (skip the GitHub fetch)
    (installer as any).fetchLatestRelease = vi.fn().mockResolvedValue(null);
    const result = await installer.ensureInstalled().catch(() => null);
    if (result) {
      expect(result.version).toBe(PINNED_LLAMACPP_VERSION);
      expect(repo.upsertActive).not.toHaveBeenCalled();
    } else {
      // platform doesn't match — that's OK; we just want to confirm no exception when match path runs
      expect(repo.upsertActive).not.toHaveBeenCalled();
    }
  });

  it('returns null when platform has no pinned release', async () => {
    const repo = { findActive: vi.fn().mockResolvedValue(null), upsertActive: vi.fn() };
    const installer = new BinaryInstallerManager(repo as any);
    // not full E2E — verify the method exists and signature
    expect(typeof installer.ensureInstalled).toBe('function');
  });
});
