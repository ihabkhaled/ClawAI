import { createHash } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { MAX_ARTIFACT_BYTES, PUBLIC_ARTIFACT_PATH } from '../constants/artifact.constants';
import { type PublishArtifactDto } from '../dto/publish-artifact.dto';
import { ArtifactErrorCode } from '../enums/artifact-error-code.enum';
import { PublishedArtifactsRepository } from '../repositories/published-artifacts.repository';
import {
  type ArtifactMeasurement,
  type ArtifactSummary,
  type ArtifactSummaryRow,
} from '../types/artifact.types';
import { generateArtifactPublicId } from '../utilities/artifact-public-id.utility';
import { containsArtifactSecret } from '../utilities/artifact-secret-scan.utility';

/**
 * Hosted, read-only pages published from the coding agent (F025).
 *
 * Every refusal is decided BEFORE anything is written, and none of them uses
 * 404/405/501 — the extension reads those as "this backend has no route".
 */
@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);

  constructor(private readonly repository: PublishedArtifactsRepository) {}

  async publish(
    userId: string,
    dto: PublishArtifactDto,
    zeroRetention: boolean,
  ): Promise<ArtifactSummary> {
    const { sizeBytes, sha256 } = this.assertPublishable(userId, dto, zeroRetention);
    const row = await this.repository.create({
      publicId: generateArtifactPublicId(),
      userId,
      title: dto.title ?? null,
      filename: dto.filename,
      mimeType: dto.mimeType,
      content: dto.content,
      sizeBytes,
      sha256,
    });
    this.logger.log(`artifact published id=${row.id} bytes=${String(sizeBytes)}`);
    return this.toSummary(row);
  }

  /** Every refusal, in order, before anything is written. Returns what it measured. */
  private assertPublishable(
    userId: string,
    dto: PublishArtifactDto,
    zeroRetention: boolean,
  ): ArtifactMeasurement {
    if (zeroRetention) {
      throw new BusinessException(
        'Zero data retention is on, so nothing is published: a published page is stored on the server.',
        ArtifactErrorCode.ZERO_RETENTION,
        HttpStatus.CONFLICT,
      );
    }
    const sizeBytes = Buffer.byteLength(dto.content, 'utf8');
    if (sizeBytes > MAX_ARTIFACT_BYTES) {
      throw new BusinessException(
        `An artifact can be at most ${String(MAX_ARTIFACT_BYTES)} bytes.`,
        ArtifactErrorCode.TOO_LARGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    if (dto.content.includes('\u0000')) {
      throw new BusinessException(
        'Only text files can be published.',
        ArtifactErrorCode.NOT_TEXT,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const sha256 = createHash('sha256').update(dto.content, 'utf8').digest('hex');
    if (sha256 !== dto.sha256) {
      throw new BusinessException(
        'The content does not match its sha256.',
        ArtifactErrorCode.HASH_MISMATCH,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (containsArtifactSecret(dto.content)) {
      // Never log the match: it is the credential.
      this.logger.warn(`publish refused: credential shape found (user=${userId})`);
      throw new BusinessException(
        'A credential is present in the file. Remove it and publish again.',
        ArtifactErrorCode.CONTAINS_SECRET,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { sizeBytes, sha256 };
  }

  async list(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ArtifactSummary>> {
    const [rows, total] = await Promise.all([
      this.repository.findByUser(userId, page, limit),
      this.repository.countByUser(userId),
    ]);
    return {
      data: rows.map((row) => this.toSummary(row)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repository.deleteOwned(id, userId);
    if (removed === 0) {
      // Another user's artifact and a missing one answer the same.
      throw this.notFound();
    }
  }

  /** The public read. One uniform 404 for unknown and deleted. */
  async readPublic(publicId: string): Promise<string> {
    const artifact = await this.repository.findByPublicId(publicId);
    if (artifact === null) {
      throw this.notFound();
    }
    return artifact.content;
  }

  private notFound(): BusinessException {
    return new BusinessException(
      'Artifact not found',
      ArtifactErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  private toSummary(row: ArtifactSummaryRow): ArtifactSummary {
    return { ...row, url: this.publicUrl(row.publicId) };
  }

  /** Built from configuration, never from a request Host header. */
  private publicUrl(publicId: string): string {
    const origin = AppConfig.get().PUBLIC_SITE_URL.replace(/\/+$/u, '');
    return `${origin}${PUBLIC_ARTIFACT_PATH}/${publicId}`;
  }
}
