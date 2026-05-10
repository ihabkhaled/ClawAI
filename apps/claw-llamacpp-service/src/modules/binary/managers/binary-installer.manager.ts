import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';
import {
  computeSha256,
  detectPlatform,
  extractArchive,
  getDiskSpace,
} from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { BinaryReleaseRepository } from '../repositories/binary-release.repository';
import {
  BINARY_DOWNLOAD_TIMEOUT_MS,
  BINARY_RELEASES,
  BINARY_REQUIRED_FREE_BYTES,
  BINARY_RESOLVE_TIMEOUT_MS,
  LATEST_LLAMACPP_RELEASE_API_URL,
  PINNED_LLAMACPP_VERSION,
  PLATFORM_ASSET_PATTERNS,
} from '../constants/binary-releases.constants';
import {
  type BinaryInstallResult,
  type GithubReleaseAsset,
  type GithubReleaseResponse,
  type ResolvedBinaryRelease,
} from '../types/binary.types';

@Injectable()
export class BinaryInstallerManager {
  private readonly logger = new Logger(BinaryInstallerManager.name);

  constructor(private readonly releaseRepo: BinaryReleaseRepository) {}

  async ensureInstalled(): Promise<BinaryInstallResult | null> {
    this.logger.debug('ensureInstalled: starting');
    const platform = await detectPlatform();
    const release = await this.resolveRelease(platform.key);
    if (!release) {
      this.logger.warn(`ensureInstalled: no release available for platform=${platform.key}`);
      return null;
    }

    const existing = await this.releaseRepo.findActive(platform.key);
    if (existing?.version === release.tag) {
      const onDisk = await this.binaryExists(existing.binaryPath);
      if (onDisk) {
        this.logger.log(
          `ensureInstalled: already installed v${existing.version} at ${existing.binaryPath}`,
        );
        return {
          binaryPath: existing.binaryPath,
          version: existing.version,
          platform: existing.platform,
        };
      }
      this.logger.warn(`ensureInstalled: DB record present but binary missing on disk`);
    }

    return this.install(platform.key, release);
  }

  private async resolveRelease(platformKey: string): Promise<ResolvedBinaryRelease | null> {
    if (AppConfig.get().LLAMACPP_FORCE_PINNED_BINARY) {
      this.logger.log(
        `resolveRelease: LLAMACPP_FORCE_PINNED_BINARY=true — skipping dynamic GitHub lookup`,
      );
      return this.resolvePinnedRelease(platformKey);
    }

    try {
      const dynamic = await this.fetchLatestRelease(platformKey);
      if (dynamic) {
        this.logger.log(
          `resolveRelease: dynamic ${dynamic.tag} → ${dynamic.assetName} (platform=${platformKey})`,
        );
        return dynamic;
      }
    } catch (error) {
      this.logger.warn(
        `resolveRelease: dynamic lookup failed — ${(error as Error).message}; falling back to pinned`,
      );
    }

    return this.resolvePinnedRelease(platformKey);
  }

  private resolvePinnedRelease(platformKey: string): ResolvedBinaryRelease | null {
    const pinned = Object.entries(BINARY_RELEASES).find(([k]) => k === platformKey)?.[1];
    if (!pinned) {
      return null;
    }
    this.logger.log(`resolveRelease: using pinned v${PINNED_LLAMACPP_VERSION} for ${platformKey}`);
    return {
      tag: PINNED_LLAMACPP_VERSION,
      archiveUrl: pinned.archiveUrl,
      assetName: path.basename(pinned.archiveUrl),
      binaryName: pinned.binaryName,
    };
  }

  private async fetchLatestRelease(platformKey: string): Promise<ResolvedBinaryRelease | null> {
    this.logger.debug(`fetchLatestRelease: GET ${LATEST_LLAMACPP_RELEASE_API_URL}`);
    const response = await request(LATEST_LLAMACPP_RELEASE_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'claw-llamacpp-service',
      },
      headersTimeout: BINARY_RESOLVE_TIMEOUT_MS,
      bodyTimeout: BINARY_RESOLVE_TIMEOUT_MS,
    });
    if (response.statusCode !== 200) {
      throw new Error(`GitHub API returned ${String(response.statusCode)}`);
    }
    const body = (await response.body.json()) as GithubReleaseResponse;
    const tag = body.tag_name;
    const asset = this.pickAsset(body.assets ?? [], platformKey);
    if (!asset) {
      this.logger.warn(
        `fetchLatestRelease: no matching asset for ${platformKey} in release ${tag}`,
      );
      return null;
    }
    return {
      tag,
      archiveUrl: asset.browser_download_url,
      assetName: asset.name,
      binaryName: this.deriveBinaryName(platformKey),
    };
  }

  private pickAsset(assets: GithubReleaseAsset[], platformKey: string): GithubReleaseAsset | null {
    const patterns =
      Object.entries(PLATFORM_ASSET_PATTERNS).find(([k]) => k === platformKey)?.[1] ?? [];
    for (const pattern of patterns) {
      const match = assets.find((asset) => pattern.test(asset.name));
      if (match) {
        return match;
      }
    }
    return null;
  }

  private deriveBinaryName(platformKey: string): string {
    return platformKey.startsWith('win-') ? 'llama-server.exe' : 'llama-server';
  }

  private async install(
    platformKey: string,
    release: ResolvedBinaryRelease,
  ): Promise<BinaryInstallResult> {
    const config = AppConfig.get();
    const dataPath = config.LLAMACPP_DATA_PATH;
    const binDir = path.join(dataPath, 'bin');

    await fs.promises.mkdir(binDir, { recursive: true });
    await this.assertDiskSpace(binDir);

    const tempDir = path.join(dataPath, 'tmp', `binary-${Date.now()}`);
    const archivePath = path.join(tempDir, release.assetName);
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      await this.downloadArchive(release.archiveUrl, archivePath);
      await this.maybeVerifyArchive(archivePath, platformKey);
      await extractArchive(archivePath, binDir);
      const resolvedBinaryPath = await this.locateBinary(binDir, release.binaryName);
      if (process.platform !== 'win32') {
        await fs.promises.chmod(resolvedBinaryPath, 0o755).catch(() => {});
      }
      await this.releaseRepo.upsertActive({
        version: release.tag,
        platform: platformKey,
        archiveUrl: release.archiveUrl,
        archiveSha256: '',
        binaryPath: resolvedBinaryPath,
      });
      this.logger.log(`install: ${platformKey} v${release.tag} installed at ${resolvedBinaryPath}`);
      return { binaryPath: resolvedBinaryPath, version: release.tag, platform: platformKey };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async binaryExists(binaryPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(binaryPath);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  }

  private async assertDiskSpace(targetPath: string): Promise<void> {
    const space = await getDiskSpace(targetPath);
    if (space.freeBytes > 0n && space.freeBytes < BINARY_REQUIRED_FREE_BYTES) {
      this.logger.error(
        `assertDiskSpace: insufficient (${space.freeBytes} < ${BINARY_REQUIRED_FREE_BYTES})`,
      );
      throw new Error('Insufficient disk space for binary install');
    }
  }

  private async downloadArchive(url: string, destPath: string): Promise<void> {
    this.logger.log(`downloadArchive: ${url} → ${destPath}`);
    const response = await request(url, {
      method: 'GET',
      headersTimeout: 30_000,
      bodyTimeout: BINARY_DOWNLOAD_TIMEOUT_MS,
      maxRedirections: 5,
    });
    if (response.statusCode >= 400) {
      throw new Error(`Binary download failed: HTTP ${response.statusCode}`);
    }
    const writer = fs.createWriteStream(destPath);
    await new Promise<void>((resolve, reject) => {
      response.body.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
      response.body.on('error', reject);
    });
  }

  private async maybeVerifyArchive(archivePath: string, platformKey: string): Promise<void> {
    const pinned = Object.entries(BINARY_RELEASES).find(([k]) => k === platformKey)?.[1];
    const expected = pinned?.archiveSha256;
    if (!expected || expected === '0'.repeat(64)) {
      this.logger.warn(
        `maybeVerifyArchive: no real SHA pinned for ${platformKey} — skipping verification`,
      );
      return;
    }
    const actual = await computeSha256(archivePath);
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      this.logger.error(`maybeVerifyArchive: mismatch — expected=${expected} actual=${actual}`);
      throw new Error('Binary archive SHA-256 mismatch');
    }
  }

  private async locateBinary(binDir: string, binaryName: string): Promise<string> {
    const direct = path.join(binDir, binaryName);
    if (await this.binaryExists(direct)) {
      return direct;
    }
    const found = await this.searchBinaryRecursive(binDir, binaryName, 3);
    if (!found) {
      throw new Error(`locateBinary: ${binaryName} not found under ${binDir}`);
    }
    return found;
  }

  private async searchBinaryRecursive(
    dir: string,
    binaryName: string,
    depth: number,
  ): Promise<string | null> {
    if (depth < 0) {
      return null;
    }
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === binaryName) {
        return full;
      }
      if (entry.isDirectory()) {
        const nested = await this.searchBinaryRecursive(full, binaryName, depth - 1);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }
}
