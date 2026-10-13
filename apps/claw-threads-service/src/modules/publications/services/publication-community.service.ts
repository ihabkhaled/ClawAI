import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import {
  BOARD_COUNTS_PORT,
  type BoardCountsPort,
} from '../../publication-community/ports/board-counts.port';
import { CommentRateLimitService } from '../../publication-community/services/comment-rate-limit.service';

import type { CreatePublicationChangeRequestDto } from '../dto/create-publication-change-request.dto';
import type { CreatePublicationCommentDto } from '../dto/create-publication-comment.dto';
import type { CreatePublicationReportDto } from '../dto/create-publication-report.dto';
import type { ModeratePublicationReportDto } from '../dto/moderate-publication-report.dto';
import type { ResolvePublicationChangeRequestDto } from '../dto/resolve-publication-change-request.dto';
import type { SetPublicationReactionDto } from '../dto/set-publication-reaction.dto';
import { PublicationsRepository } from '../repositories/publications.repository';
import { PublicationLifecycleService } from './publication-lifecycle.service';
import type {
  ModerationReportView,
  PublicationChangeRequestView,
  PublicationReactionSummary,
  PublicPublicationComment,
} from '../types/publication-community.types';
import type { PublicationEditResult } from '../types/publication.types';

@Injectable()
export class PublicationCommunityService {
  private readonly logger = new Logger(PublicationCommunityService.name);

  constructor(
    private readonly publications: PublicationsRepository,
    private readonly lifecycle: PublicationLifecycleService,
    @Optional() private readonly commentRateLimit?: CommentRateLimitService,
    @Optional() @Inject(BOARD_COUNTS_PORT) private readonly boardCounts?: BoardCountsPort,
  ) {}

  /** Community reads never turn an unexpected data error into a 500; unknown slugs stay 404. */
  private async resilient<T>(read: () => Promise<T>, empty: T): Promise<T> {
    try {
      return await read();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Community read failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return empty;
    }
  }

  /** A Board counter update must never fail the user's own action. */
  private async notifyCounts(update: (port: BoardCountsPort) => Promise<void>): Promise<void> {
    if (!this.boardCounts) return;
    try {
      await update(this.boardCounts);
    } catch (error) {
      this.logger.warn(
        `Board counts update failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async listComments(slug: string): Promise<PublicPublicationComment[]> {
    const comments = await this.resilient(() => this.publications.findPublicComments(slug), []);
    if (!comments) throw new NotFoundException('Publication not found');
    return comments;
  }

  async addComment(
    slug: string,
    userId: string,
    input: CreatePublicationCommentDto,
  ): Promise<PublicPublicationComment> {
    await this.commentRateLimit?.assertAllowed(userId);
    const comment = await this.publications.createPublicComment(slug, userId, input);
    if (!comment) throw new NotFoundException('Publication not found');
    await this.notifyCounts((port) => port.commentsChanged(slug));
    return comment;
  }

  async setReaction(
    slug: string,
    userId: string,
    input: SetPublicationReactionDto,
  ): Promise<PublicationReactionSummary> {
    const summary = await this.publications.setPublicReaction(slug, userId, input);
    if (!summary) throw new NotFoundException('Publication not found');
    await this.notifyCounts((port) => port.reactionsChanged(slug, summary.likes, summary.dislikes));
    return summary;
  }

  async removeReaction(slug: string, userId: string): Promise<PublicationReactionSummary> {
    const summary = await this.publications.removePublicReaction(slug, userId);
    if (!summary) throw new NotFoundException('Publication not found');
    await this.notifyCounts((port) => port.reactionsChanged(slug, summary.likes, summary.dislikes));
    return summary;
  }

  async getReactionSummary(slug: string, viewerId?: string): Promise<PublicationReactionSummary> {
    const summary = await this.resilient(
      () => this.publications.findPublicReactionSummary(slug, viewerId),
      { likes: 0, dislikes: 0, viewerReaction: null },
    );
    if (!summary) throw new NotFoundException('Publication not found');
    return summary;
  }

  async requestChange(
    slug: string,
    userId: string,
    input: CreatePublicationChangeRequestDto,
  ): Promise<PublicationChangeRequestView> {
    const request = await this.publications.createPublicChangeRequest(slug, userId, input);
    if (!request) throw new NotFoundException('Publication not found');
    return request;
  }

  async report(
    slug: string,
    userId: string,
    input: CreatePublicationReportDto,
  ): Promise<{ id: string; status: 'OPEN' }> {
    const report = await this.publications.createPublicReport(slug, userId, input);
    if (!report) throw new NotFoundException('Publication or comment not found');
    return report;
  }

  async listOwnerChangeRequests(
    publicationId: string,
    ownerId: string,
  ): Promise<PublicationChangeRequestView[]> {
    const requests = await this.publications.findOwnedChangeRequests(publicationId, ownerId);
    if (!requests) throw new NotFoundException('Publication not found');
    return requests;
  }

  async resolveOwnerChangeRequest(
    publicationId: string,
    ownerId: string,
    requestId: string,
    input: ResolvePublicationChangeRequestDto,
  ): Promise<{ resolved: true; edit: PublicationEditResult | null }> {
    const existing = await this.publications.findOwnedChangeRequest(
      publicationId,
      ownerId,
      requestId,
    );
    if (!existing) throw new NotFoundException('Change request not found');
    if (existing.status !== 'PENDING') {
      throw new ConflictException('Change request is already resolved');
    }
    let acceptedRevisionId: string | null = null;
    let edit: PublicationEditResult | null = null;
    if (input.status === 'ACCEPTED') {
      edit = await this.lifecycle.editRevision(publicationId, ownerId, input.revision);
      acceptedRevisionId = edit.revisionId;
    }
    const resolved = await this.publications.resolveOwnedChangeRequest(
      publicationId,
      ownerId,
      requestId,
      input,
      acceptedRevisionId,
    );
    if (resolved) return { resolved: true, edit };
    const latest = await this.publications.findOwnedChangeRequest(
      publicationId,
      ownerId,
      requestId,
    );
    if (latest?.status === 'ACCEPTED' && latest.acceptedRevisionId === acceptedRevisionId) {
      return { resolved: true, edit };
    }
    if (!latest) throw new NotFoundException('Change request not found');
    throw new ConflictException('Change request is already resolved');
  }

  listModerationReports(): Promise<ModerationReportView[]> {
    return this.publications.findOpenModerationReports();
  }

  async resolveModerationReport(
    reportId: string,
    moderatorId: string,
    input: ModeratePublicationReportDto,
  ): Promise<{ resolved: true }> {
    const resolved = await this.publications.resolveModerationReport(
      reportId,
      moderatorId,
      input.status,
      input.hideComment ?? false,
    );
    if (!resolved) throw new ConflictException('Report is not open');
    return { resolved: true };
  }
}
