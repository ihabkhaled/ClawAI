import { type ImportAuditAction } from '../../../common/enums/import-audit-action.enum';
import { type ImportComponentKind } from '../../../common/enums/import-component-kind.enum';
import { type ImportFormat } from '../../../common/enums/import-format.enum';
import { type ImportInstallOutcome } from '../../../common/enums/import-install-outcome.enum';
import { type ImportReasonKey } from '../../../common/enums/import-reason-key.enum';
import { type ImportRisk } from '../../../common/enums/import-risk.enum';
import { type ImportSourceKind } from '../../../common/enums/import-source-kind.enum';
import { type ImportSupport } from '../../../common/enums/import-support.enum';

/** One file read into memory. Never written to disk. */
export type BundleFile = { path: string; content: Buffer };

export type ImportComponent = {
  kind: ImportComponentKind;
  name: string;
  /** Path inside the bundle, or the manifest path for inline declarations. */
  path: string;
  description: string;
  support: ImportSupport;
  reasonKey?: ImportReasonKey;
  /** Remote MCP server URL (https) when `support` is USABLE. */
  url?: string;
};

export type ImportPreview = {
  format: ImportFormat;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  components: ImportComponent[];
  risk: ImportRisk;
  warnings: string[];
  fileCount: number;
  keptFileCount: number;
  ignoredFileCount: number;
  totalBytes: number;
};

export type MarketplaceCandidate = {
  name: string;
  description: string;
  /** Relative directory inside this source, when selectable here. */
  subdir?: string;
  /** `owner/repo` when the entry lives in another GitHub repository. */
  github?: string;
};

export type ParsedBundle = {
  preview: ImportPreview;
  /** The files that will be stored (inert text). */
  files: BundleFile[];
};

export type ParseResult =
  | { kind: 'PLUGIN'; bundle: ParsedBundle }
  | { kind: 'MARKETPLACE'; name: string; candidates: MarketplaceCandidate[] };

export type ArchiveStats = { fileCount: number; skippedCount: number; totalBytes: number };

export type ParseInput = {
  files: BundleFile[];
  /** Directory inside the source to import (a marketplace entry, or a repo sub-folder). */
  subdir?: string;
  /** Used when the manifest has no name (the repository or file name). */
  fallbackName: string;
  /** Archive wrappers (`repo-main/`) are removed for uploads; GitHub files are already rooted. */
  stripWrapper: boolean;
  stats: ArchiveStats;
};

export type ExtractContext = {
  files: ReadonlyMap<string, Buffer>;
  manifest: Record<string, unknown>;
  manifestPath: string;
  warnings: Set<string>;
};

export type FrontMatter = { data: Record<string, string>; body: string };

export type ArchiveReadResult = {
  files: BundleFile[];
  /** Every file entry in the archive (kept or not). */
  fileCount: number;
  skippedCount: number;
  /** Declared uncompressed bytes of every file entry. */
  totalBytes: number;
};

export type KeepPredicate = (path: string) => boolean;

export type ZipCentralEntry = {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  isDirectory: boolean;
};

export type GithubCoordinates = {
  owner: string;
  repo: string;
  ref?: string;
  subdir: string;
};

export type FetchedSource = { files: BundleFile[]; commitSha: string; ref: string };

export type GithubTreeItem = { path: string; mode: string; type: string; size: number };
export type GithubTreeEntry = { path: string; relative: string; size: number };
export type GithubReply = {
  status: number;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
};
export type RequestCounter = { requests: number };

export type SourceView = { kind: ImportSourceKind; ref: string; commitSha: string | null };

export type ImportDraftView = {
  draftId: string;
  checksum: string;
  source: SourceView;
  preview: ImportPreview;
  expiresAt: string;
};

export type ImportPreviewResponse =
  | { kind: 'PLUGIN'; draft: ImportDraftView }
  | { kind: 'MARKETPLACE'; name: string; candidates: MarketplaceCandidate[] };

export type ImportedPluginView = {
  id: string;
  name: string;
  version: string;
  description: string;
  source: SourceView;
  checksum: string;
  preview: ImportPreview;
  totalBytes: number;
  fileCount: number;
  createdAt: string;
};

export type StoredDraftFile = { path: string; content: string };

export type UploadedArchive = { buffer: Buffer; originalname: string };

export type DraftRecord = {
  id: string;
  userId: string;
  sourceKind: string;
  sourceRef: string;
  commitSha: string | null;
  checksum: string;
  preview: ImportPreview;
  files: StoredDraftFile[];
  totalBytes: number;
  expiresAt: Date;
};

export type NewDraft = Omit<DraftRecord, 'id' | 'expiresAt'>;

export type PluginRecord = {
  id: string;
  name: string;
  version: string;
  sourceKind: string;
  sourceRef: string;
  commitSha: string | null;
  checksum: string;
  preview: ImportPreview;
  totalBytes: number;
  fileCount: number;
  createdAt: Date;
};

export type InstallDraftResult =
  | { outcome: ImportInstallOutcome.INSTALLED; record: PluginRecord }
  | {
      outcome:
        | ImportInstallOutcome.QUOTA_PLUGINS
        | ImportInstallOutcome.QUOTA_BYTES
        | ImportInstallOutcome.DUPLICATE;
    };

export type AuditEntry = {
  userId: string;
  action: ImportAuditAction;
  pluginName: string;
  sourceKind: string;
  sourceRef: string;
  commitSha: string | null;
  checksum: string;
};

export type PluginRow = Omit<PluginRecord, 'preview'> & { preview: unknown };
