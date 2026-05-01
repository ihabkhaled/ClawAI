export interface BinaryReleaseInfo {
  archiveUrl: string;
  archiveSha256: string;
  binaryName: string;
}

export interface ResolvedBinaryRelease {
  tag: string;
  archiveUrl: string;
  assetName: string;
  binaryName: string;
}

export interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubReleaseResponse {
  tag_name: string;
  assets: GithubReleaseAsset[];
}

export interface BinaryStatus {
  installed: boolean;
  version: string | null;
  platform: string | null;
  path: string | null;
}

export interface BinaryInstallResult {
  binaryPath: string;
  version: string;
  platform: string;
}

export interface RuntimeInfo {
  binaryVersion: string | null;
  platform: string;
  gpuBackend: string;
  binaryPath: string | null;
  capabilities: string[];
}
