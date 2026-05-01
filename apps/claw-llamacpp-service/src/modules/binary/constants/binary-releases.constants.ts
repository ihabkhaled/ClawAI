import { type BinaryReleaseInfo } from '../types/binary.types';

export const PINNED_LLAMACPP_VERSION = 'b4123';

/**
 * GitHub API endpoint for the latest llama.cpp release.
 * Used by BinaryInstallerManager to dynamically resolve the newest binary,
 * since pinning a specific release tag breaks every time upstream renames.
 */
export const LATEST_LLAMACPP_RELEASE_API_URL =
  'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest';

/**
 * Per-platform asset name patterns used to pick the right archive from the
 * GitHub release's `assets[].name` list. Matched in priority order.
 * Newer llama.cpp drops the "-cpu" suffix on Linux ubuntu-x64 builds.
 */
export const PLATFORM_ASSET_PATTERNS: Readonly<Record<string, RegExp[]>> = Object.freeze({
  'linux-x64-cpu': [
    /^llama-.*-bin-ubuntu-x64\.tar\.gz$/,
    /^llama-.*-bin-ubuntu-cpu-x64\.tar\.gz$/,
  ],
  'linux-x64-vulkan': [/^llama-.*-bin-ubuntu-vulkan-x64\.tar\.gz$/],
  'linux-x64-cuda12': [
    /^llama-.*-bin-ubuntu-cuda.*x64\.tar\.gz$/,
    /^llama-.*-bin-ubuntu-x64\.tar\.gz$/,
  ],
  'linux-x64-rocm': [
    /^llama-.*-bin-ubuntu-rocm.*x64\.tar\.gz$/,
    /^llama-.*-bin-ubuntu-x64\.tar\.gz$/,
  ],
  'linux-arm64-cpu': [/^llama-.*-bin-ubuntu-arm64\.tar\.gz$/],
  'linux-arm64-vulkan': [/^llama-.*-bin-ubuntu-vulkan-arm64\.tar\.gz$/],
  'win-x64-cpu': [/^llama-.*-bin-win-cpu-x64\.zip$/],
  'win-x64-cuda12': [
    /^llama-.*-bin-win-cuda-12\..*-x64\.zip$/,
    /^llama-.*-bin-win-cuda-cu12.*-x64\.zip$/,
  ],
  'win-x64-cuda13': [/^llama-.*-bin-win-cuda-13\..*-x64\.zip$/],
  'win-x64-vulkan': [/^llama-.*-bin-win-vulkan-x64\.zip$/],
  'darwin-arm64-metal': [
    /^llama-.*-bin-macos-arm64\.tar\.gz$/,
    /^llama-.*-bin-macos-arm64\.zip$/,
  ],
  'darwin-x64-cpu': [
    /^llama-.*-bin-macos-x64\.tar\.gz$/,
    /^llama-.*-bin-macos-x64\.zip$/,
  ],
});

export const BINARY_RESOLVE_TIMEOUT_MS = 15_000;

export const BINARY_RELEASES: Readonly<Record<string, BinaryReleaseInfo>> = Object.freeze({
  'win-x64-cuda12': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-win-cuda-cu12.2.0-x64.zip',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server.exe',
  },
  'win-x64-vulkan': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-win-vulkan-x64.zip',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server.exe',
  },
  'win-x64-cpu': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-win-cpu-x64.zip',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server.exe',
  },
  'linux-x64-cuda12': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-ubuntu-cuda-cu12.2.0-x64.tar.gz',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server',
  },
  'linux-x64-vulkan': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-ubuntu-vulkan-x64.tar.gz',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server',
  },
  'linux-x64-cpu': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-ubuntu-cpu-x64.tar.gz',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server',
  },
  'darwin-arm64-metal': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-macos-arm64.zip',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server',
  },
  'darwin-x64-cpu': {
    archiveUrl:
      'https://github.com/ggerganov/llama.cpp/releases/download/b4123/llama-b4123-bin-macos-x64.zip',
    archiveSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    binaryName: 'llama-server',
  },
});

export const BINARY_DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
export const BINARY_REQUIRED_FREE_BYTES = 1_073_741_824n;
