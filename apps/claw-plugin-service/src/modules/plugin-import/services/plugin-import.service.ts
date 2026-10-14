import { Injectable } from '@nestjs/common';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { ImportInstallOutcome } from '../../../common/enums/import-install-outcome.enum';
import { ImportSourceKind } from '../../../common/enums/import-source-kind.enum';
import { InstallPlanGateManager } from '../../installs/managers/install-plan-gate.manager';
import { ARCHIVE_SUFFIX, UPLOAD_NAME_MAX } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import { GithubSourceManager } from '../managers/github-source.manager';
import { PluginImportRepository } from '../repositories/plugin-import.repository';
import {
  type BundleFile,
  type ImportedPluginView,
  type ImportPreviewResponse,
  type ParseResult,
  type PluginRecord,
  type SourceView,
  type UploadedArchive,
} from '../types/plugin-import.types';
import { computeBundleChecksum } from '../utilities/compute-bundle-checksum.utility';
import { decodeUtf8Strict } from '../utilities/parse-hostile-json.utility';
import { parseGithubSource } from '../utilities/parse-github-source.utility';
import { parsePluginBundle } from '../utilities/parse-plugin-bundle.utility';
import { isReadablePath } from '../utilities/plugin-paths.utility';
import { readArchive } from '../utilities/read-archive.utility';
import { nameKey } from '../utilities/sanitize-display-text.utility';

/**
 * Import, review, install. Nothing here runs imported code: a source is read into memory, parsed into a
 * preview, held as a draft the user must confirm (by checksum), and only then stored as inert documents.
 */
@Injectable()
export class PluginImportService {
  constructor(
    private readonly github: GithubSourceManager,
    private readonly repository: PluginImportRepository,
    private readonly planGate: InstallPlanGateManager,
  ) {}

  async previewGithub(
    userId: string,
    source: string,
    subdir?: string,
  ): Promise<ImportPreviewResponse> {
    await this.planGate.resolveInstallCap(userId);
    const coordinates = parseGithubSource(source);
    if (subdir !== undefined && subdir !== '') coordinates.subdir = subdir;
    const fetched = await this.github.fetch(coordinates);
    const total = fetched.files.reduce((sum, file) => sum + file.content.length, 0);
    const folderName = coordinates.subdir.split('/').pop();
    const parsed = parsePluginBundle({
      files: fetched.files,
      fallbackName: folderName === undefined || folderName === '' ? coordinates.repo : folderName,
      stripWrapper: false,
      stats: { fileCount: fetched.files.length, skippedCount: 0, totalBytes: total },
    });
    const folder = coordinates.subdir === '' ? '' : `/${coordinates.subdir}`;
    return this.finishPreview(userId, parsed, {
      kind: ImportSourceKind.GITHUB,
      ref: `${coordinates.owner}/${coordinates.repo}${folder}@${fetched.ref}`,
      commitSha: fetched.commitSha,
    });
  }

  async previewUpload(
    userId: string,
    upload: UploadedArchive | undefined,
    subdir?: string,
  ): Promise<ImportPreviewResponse> {
    if (upload === undefined) {
      throw new PluginImportError(ImportErrorCode.UPLOAD_MISSING, 'no file was uploaded');
    }
    await this.planGate.resolveInstallCap(userId);
    const read = readArchive(upload.buffer, isReadablePath);
    const parsed = parsePluginBundle({
      files: read.files,
      subdir,
      fallbackName: upload.originalname.replace(ARCHIVE_SUFFIX, ''),
      stripWrapper: true,
      stats: {
        fileCount: read.fileCount,
        skippedCount: read.skippedCount,
        totalBytes: read.totalBytes,
      },
    });
    return this.finishPreview(userId, parsed, {
      kind: ImportSourceKind.UPLOAD,
      ref: upload.originalname.slice(0, UPLOAD_NAME_MAX),
      commitSha: null,
    });
  }

  async confirm(userId: string, draftId: string, checksum: string): Promise<ImportedPluginView> {
    await this.planGate.resolveInstallCap(userId);
    const draft = await this.repository.findDraft(draftId, userId);
    if (draft === null) {
      throw new PluginImportError(
        ImportErrorCode.DRAFT_NOT_FOUND,
        'the review expired or does not exist',
      );
    }
    if (draft.checksum !== checksum) {
      throw new PluginImportError(
        ImportErrorCode.CHECKSUM_MISMATCH,
        'the reviewed checksum differs',
      );
    }
    // Defence in depth: the stored draft must still hash to what the user saw.
    const files: BundleFile[] = draft.files.map((file) => ({
      path: file.path,
      content: Buffer.from(file.content, 'utf8'),
    }));
    if (computeBundleChecksum(files, draft.preview) !== draft.checksum) {
      throw new PluginImportError(
        ImportErrorCode.CHECKSUM_MISMATCH,
        'the draft changed after review',
      );
    }
    const result = await this.repository.installDraft(draft, nameKey(draft.preview.name));
    switch (result.outcome) {
      case ImportInstallOutcome.INSTALLED:
        return this.present(result.record);
      case ImportInstallOutcome.QUOTA_PLUGINS:
        throw new PluginImportError(ImportErrorCode.QUOTA_PLUGINS, 'too many imported plugins');
      case ImportInstallOutcome.QUOTA_BYTES:
        throw new PluginImportError(ImportErrorCode.QUOTA_BYTES, 'imported plugin storage is full');
      case ImportInstallOutcome.DUPLICATE:
        throw new PluginImportError(
          ImportErrorCode.DUPLICATE_PLUGIN,
          'a plugin with this name is already imported',
        );
    }
  }

  async list(userId: string): Promise<ImportedPluginView[]> {
    return (await this.repository.list(userId)).map((record) => this.present(record));
  }

  async get(userId: string, id: string): Promise<ImportedPluginView> {
    const record = await this.repository.findOwned(id, userId);
    if (record === null) {
      throw new PluginImportError(ImportErrorCode.NOT_FOUND, 'imported plugin not found');
    }
    return this.present(record);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repository.remove(id, userId);
    if (!removed) {
      throw new PluginImportError(ImportErrorCode.NOT_FOUND, 'imported plugin not found');
    }
  }

  private async finishPreview(
    userId: string,
    parsed: ParseResult,
    source: SourceView,
  ): Promise<ImportPreviewResponse> {
    if (parsed.kind === 'MARKETPLACE') {
      return { kind: 'MARKETPLACE', name: parsed.name, candidates: parsed.candidates };
    }
    const { preview, files } = parsed.bundle;
    const checksum = computeBundleChecksum(files, preview);
    const draft = await this.repository.createDraft({
      userId,
      sourceKind: source.kind,
      sourceRef: source.ref,
      commitSha: source.commitSha,
      checksum,
      preview,
      files: files.map((file) => ({
        path: file.path,
        content: decodeUtf8Strict(file.content, file.path),
      })),
      totalBytes: files.reduce((sum, file) => sum + file.content.length, 0),
    });
    return {
      kind: 'PLUGIN',
      draft: {
        draftId: draft.id,
        checksum,
        source,
        preview,
        expiresAt: draft.expiresAt.toISOString(),
      },
    };
  }

  private present(record: PluginRecord): ImportedPluginView {
    return {
      id: record.id,
      name: record.name,
      version: record.version,
      description: record.preview.description,
      source: {
        kind: record.sourceKind as ImportSourceKind,
        ref: record.sourceRef,
        commitSha: record.commitSha,
      },
      checksum: record.checksum,
      preview: record.preview,
      totalBytes: record.totalBytes,
      fileCount: record.fileCount,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
