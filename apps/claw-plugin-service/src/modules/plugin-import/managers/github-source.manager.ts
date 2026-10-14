import { Injectable, Logger } from '@nestjs/common';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { EgressError } from '../../egress/errors/egress.error';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import {
  COMMIT_SHA_PATTERN,
  GITHUB_DOWNLOAD_CONCURRENCY,
  GITHUB_JSON_ACCEPT,
  GITHUB_OVERALL_TIMEOUT_MS,
  GITHUB_RATE_LIMITED_STATUSES,
  GITHUB_REGULAR_FILE_MODES,
  GITHUB_SHA_ACCEPT,
  GITHUB_TREE_CACHE_MAX,
  GITHUB_TREE_CACHE_TTL_MS,
  IMPORT_GITHUB,
  IMPORT_LIMITS,
  MARKETPLACE_PATHS,
  MS_PER_SECOND,
} from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import {
  type BundleFile,
  type CachedTree,
  type FetchedSource,
  type GithubCoordinates,
  type GithubReply,
  type GithubTreeEntry,
  type GithubTreeItem,
  type RequestCounter,
} from '../types/plugin-import.types';
import { retryAfterSeconds } from '../utilities/github-retry-after.utility';
import { encodePath } from '../utilities/encode-path.utility';
import { normalizeArchivePath } from '../utilities/normalize-archive-path.utility';
import { isPluginContentPath, isReadablePath } from '../utilities/plugin-paths.utility';

/**
 * Reads a plugin from GitHub over the SSRF-guarded egress client: no git, no clone, no code run.
 * Two API calls (commit SHA, recursive tree) then one raw download per wanted file, all pinned to the
 * resolved COMMIT SHA, so what the user reviews is exactly what is stored. Hosts, file count, bytes and
 * time are capped; redirects are refused.
 */
@Injectable()
export class GithubSourceManager {
  private readonly logger = new Logger(GithubSourceManager.name);
  /** Resolved commit + tree per repository ref, kept briefly so a retry or a second preview costs no API calls. */
  private readonly treeCache = new Map<string, CachedTree>();

  constructor(private readonly egress: SafeEgressManager) {}

  async fetch(coordinates: GithubCoordinates): Promise<FetchedSource> {
    const signal = AbortSignal.timeout(GITHUB_OVERALL_TIMEOUT_MS);
    const counter: RequestCounter = { requests: 0 };
    const { owner, repo } = coordinates;
    const ref = coordinates.ref ?? 'HEAD';
    const { sha, tree } = await this.resolveTree(owner, repo, ref, signal, counter);
    const entries = this.select(tree, coordinates.subdir);
    const files = await this.download(entries, `${owner}/${repo}`, sha, signal, counter);
    return { files, commitSha: sha, ref };
  }

  private async resolveTree(
    owner: string,
    repo: string,
    ref: string,
    signal: AbortSignal,
    counter: RequestCounter,
  ): Promise<CachedTree> {
    const key = `${owner}/${repo}@${ref}`.toLowerCase();
    const cached = this.treeCache.get(key);
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached;
    const sha = (
      await this.get(
        `https://api.github.com/repos/${owner}/${repo}/commits/${encodePath(ref)}`,
        { Accept: GITHUB_SHA_ACCEPT },
        IMPORT_GITHUB.maxTreeBytes,
        signal,
        counter,
      )
    ).trim();
    if (!COMMIT_SHA_PATTERN.test(sha)) {
      throw new PluginImportError(
        ImportErrorCode.SOURCE_UNREACHABLE,
        'GitHub did not return a commit',
      );
    }
    const tree = await this.readTree(owner, repo, sha, signal, counter);
    if (this.treeCache.size >= GITHUB_TREE_CACHE_MAX) {
      const oldest = this.treeCache.keys().next().value;
      if (oldest !== undefined) this.treeCache.delete(oldest);
    }
    const entry = { sha, tree, expiresAt: Date.now() + GITHUB_TREE_CACHE_TTL_MS };
    this.treeCache.set(key, entry);
    return entry;
  }

  private async readTree(
    owner: string,
    repo: string,
    sha: string,
    signal: AbortSignal,
    counter: RequestCounter,
  ): Promise<GithubTreeItem[]> {
    const text = await this.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
      { Accept: GITHUB_JSON_ACCEPT },
      IMPORT_GITHUB.maxTreeBytes,
      signal,
      counter,
    );
    let parsed: { tree?: unknown; truncated?: unknown };
    try {
      parsed = JSON.parse(text) as { tree?: unknown; truncated?: unknown };
    } catch {
      throw new PluginImportError(ImportErrorCode.SOURCE_UNREACHABLE, 'GitHub tree is not JSON');
    }
    if (parsed.truncated === true || !Array.isArray(parsed.tree)) {
      throw new PluginImportError(
        ImportErrorCode.SOURCE_INVALID,
        'repository is too large to import',
      );
    }
    return (parsed.tree as Array<Partial<Record<keyof GithubTreeItem, unknown>>>).flatMap(
      (item) => {
        if (typeof item.path !== 'string' || typeof item.mode !== 'string') return [];
        return [
          {
            path: item.path,
            mode: item.mode,
            type: typeof item.type === 'string' ? item.type : '',
            size: typeof item.size === 'number' ? item.size : Number.MAX_SAFE_INTEGER,
          },
        ];
      },
    );
  }

  private select(tree: GithubTreeItem[], subdir: string): GithubTreeEntry[] {
    const prefix = subdir === '' ? '' : `${subdir}/`;
    const scoped: GithubTreeEntry[] = tree
      .filter(
        (item) =>
          item.type === 'blob' &&
          GITHUB_REGULAR_FILE_MODES.has(item.mode) &&
          item.path.startsWith(prefix),
      )
      .map((item) => ({
        path: item.path,
        relative: normalizeArchivePath(item.path.slice(prefix.length)),
        size: item.size,
      }));
    const isPluginRoot = scoped.some((item) => isPluginContentPath(item.relative));
    const marketplace = scoped.filter((item) => MARKETPLACE_PATHS.includes(item.relative));
    const wanted =
      !isPluginRoot && marketplace.length > 0
        ? marketplace.slice(0, 1)
        : scoped.filter((item) => isReadablePath(item.relative));
    const usable = wanted.filter((item) => item.size <= IMPORT_LIMITS.maxStoredFileBytes);
    if (usable.length > IMPORT_GITHUB.maxFiles) {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES,
        'the source has too many plugin files',
      );
    }
    if (usable.reduce((sum, item) => sum + item.size, 0) > IMPORT_GITHUB.maxTotalBytes) {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_TOO_LARGE_UNPACKED,
        'the source plugin files are too large',
      );
    }
    return usable;
  }

  private async download(
    entries: GithubTreeEntry[],
    slug: string,
    sha: string,
    signal: AbortSignal,
    counter: RequestCounter,
  ): Promise<BundleFile[]> {
    const files: BundleFile[] = [];
    let next = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const entry = entries.at(next);
        next += 1;
        if (entry === undefined) return;
        const text = await this.get(
          `https://raw.githubusercontent.com/${slug}/${sha}/${encodePath(entry.path)}`,
          { Accept: 'text/plain' },
          IMPORT_LIMITS.maxStoredFileBytes,
          signal,
          counter,
        );
        files.push({ path: entry.relative, content: Buffer.from(text, 'utf8') });
      }
    };
    const workers = Math.min(GITHUB_DOWNLOAD_CONCURRENCY, entries.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  }

  private async get(
    url: string,
    headers: Record<string, string>,
    maxBytes: number,
    signal: AbortSignal,
    counter: RequestCounter,
  ): Promise<string> {
    counter.requests += 1;
    if (counter.requests > IMPORT_GITHUB.maxRequests) {
      throw new PluginImportError(ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES, 'too many requests');
    }
    let reply: GithubReply;
    try {
      reply = await this.egress.request({
        url,
        method: 'GET',
        headers: { 'User-Agent': IMPORT_GITHUB.userAgent, ...headers },
        timeoutMs: IMPORT_GITHUB.requestTimeoutMs,
        maxResponseBytes: maxBytes,
        signal,
        allowedHosts: IMPORT_GITHUB.hosts,
        maxRedirects: 0,
      });
    } catch (error) {
      if (error instanceof EgressError) {
        this.logger.warn(`get: egress refused or failed (${error.code})`);
        throw new PluginImportError(
          ImportErrorCode.SOURCE_UNREACHABLE,
          'GitHub could not be reached',
        );
      }
      throw error;
    }
    return this.checkedBody(reply);
  }

  private checkedBody(reply: GithubReply): string {
    if (reply.status === 404) {
      throw new PluginImportError(ImportErrorCode.SOURCE_NOT_FOUND, 'repository or path not found');
    }
    if (GITHUB_RATE_LIMITED_STATUSES.has(reply.status)) {
      const seconds = retryAfterSeconds(reply.headers);
      throw new PluginImportError(ImportErrorCode.SOURCE_RATE_LIMITED, 'GitHub is rate limiting', {
        afterSeconds: seconds,
        at: new Date(Date.now() + seconds * MS_PER_SECOND).toISOString(),
      });
    }
    if (reply.status !== 200 || reply.truncated) {
      throw new PluginImportError(
        ImportErrorCode.SOURCE_UNREACHABLE,
        reply.truncated ? 'response too large' : `unexpected status ${String(reply.status)}`,
      );
    }
    return reply.body;
  }
}
