import {
  BINARY_RELEASES,
  PLATFORM_ASSET_PATTERNS,
} from '../constants/binary-releases.constants';

describe('PLATFORM_ASSET_PATTERNS — dynamic asset matching', () => {
  // Snapshot of asset names present on the b8994 ggml-org release.
  const SAMPLE_ASSETS = [
    'llama-b8994-bin-ubuntu-x64.tar.gz',
    'llama-b8994-bin-ubuntu-vulkan-x64.tar.gz',
    'llama-b8994-bin-ubuntu-rocm-7.2-x64.tar.gz',
    'llama-b8994-bin-ubuntu-arm64.tar.gz',
    'llama-b8994-bin-ubuntu-vulkan-arm64.tar.gz',
    'llama-b8994-bin-win-cpu-x64.zip',
    'llama-b8994-bin-win-cuda-12.4-x64.zip',
    'llama-b8994-bin-win-cuda-13.1-x64.zip',
    'llama-b8994-bin-win-vulkan-x64.zip',
    'llama-b8994-bin-macos-arm64.tar.gz',
    'llama-b8994-bin-macos-x64.tar.gz',
    'cudart-llama-bin-win-cuda-12.4-x64.zip',
  ];

  function pickFirstMatch(platformKey: string): string | null {
    const patterns = PLATFORM_ASSET_PATTERNS[platformKey] ?? [];
    for (const pattern of patterns) {
      const match = SAMPLE_ASSETS.find((name) => pattern.test(name));
      if (match) {
        return match;
      }
    }
    return null;
  }

  const cases: Array<[string, string]> = [
    ['linux-x64-cpu', 'llama-b8994-bin-ubuntu-x64.tar.gz'],
    ['linux-x64-vulkan', 'llama-b8994-bin-ubuntu-vulkan-x64.tar.gz'],
    // Linux NVIDIA: upstream stopped publishing CUDA prebuilts mid-2024,
    // so the resolver prefers the Vulkan binary (NVIDIA's Vulkan ICD works
    // in containers when NVIDIA_DRIVER_CAPABILITIES=...graphics). CPU is
    // the last-resort fallback when even Vulkan is absent.
    ['linux-x64-cuda12', 'llama-b8994-bin-ubuntu-vulkan-x64.tar.gz'],
    ['linux-x64-rocm', 'llama-b8994-bin-ubuntu-rocm-7.2-x64.tar.gz'],
    ['linux-arm64-cpu', 'llama-b8994-bin-ubuntu-arm64.tar.gz'],
    ['linux-arm64-vulkan', 'llama-b8994-bin-ubuntu-vulkan-arm64.tar.gz'],
    ['win-x64-cpu', 'llama-b8994-bin-win-cpu-x64.zip'],
    ['win-x64-cuda12', 'llama-b8994-bin-win-cuda-12.4-x64.zip'],
    ['win-x64-cuda13', 'llama-b8994-bin-win-cuda-13.1-x64.zip'],
    ['win-x64-vulkan', 'llama-b8994-bin-win-vulkan-x64.zip'],
    ['darwin-arm64-metal', 'llama-b8994-bin-macos-arm64.tar.gz'],
    ['darwin-x64-cpu', 'llama-b8994-bin-macos-x64.tar.gz'],
  ];

  it.each(cases)('matches expected asset for %s', (platform, expected) => {
    expect(pickFirstMatch(platform)).toBe(expected);
  });

  it('does NOT match the cudart runtime archive for any platform', () => {
    for (const platform of Object.keys(PLATFORM_ASSET_PATTERNS)) {
      const patterns = PLATFORM_ASSET_PATTERNS[platform] ?? [];
      const matchesCudart = patterns.some((pattern) =>
        pattern.test('cudart-llama-bin-win-cuda-12.4-x64.zip'),
      );
      expect(matchesCudart).toBe(false);
    }
  });

  it('keeps the legacy BINARY_RELEASES fallback map populated for all 8 known platforms', () => {
    const required = [
      'win-x64-cuda12',
      'win-x64-vulkan',
      'win-x64-cpu',
      'linux-x64-cuda12',
      'linux-x64-vulkan',
      'linux-x64-cpu',
      'darwin-arm64-metal',
      'darwin-x64-cpu',
    ];
    for (const key of required) {
      expect(BINARY_RELEASES[key]).toBeDefined();
    }
  });
});
