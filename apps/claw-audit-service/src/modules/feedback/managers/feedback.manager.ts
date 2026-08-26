import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { basename } from 'node:path';

import { type Response } from 'express';
import { FeedbackStatus } from '@claw/shared-types';
import {
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MAX_TITLE_LENGTH,
  FEEDBACK_STATUS_TRANSITIONS,
} from '@claw/shared-constants';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { FeedbackRepository } from '../repositories/feedback.repository';
import {
  sanitizeFeedbackMarkdown,
  sanitizeFeedbackPlainText,
  toSearchText,
} from '../sanitizers/feedback-markdown.sanitizer';
import { type CreateFeedbackDto } from '../dto/create-feedback.dto';
import { fileMetadataResponseSchema } from '../dto/file-metadata-response.dto';
import { type ListFeedbackQueryDto } from '../dto/list-feedback-query.dto';
import { type UpdateFeedbackStatusDto } from '../dto/update-feedback-status.dto';
import {
  type FeedbackAttachment,
  type FeedbackHistoryEntry,
  type FileMetadataResponse,
} from '../types/feedback.types';

@Injectable()
export class FeedbackManager {
  private readonly logger = new Logger(FeedbackManager.name);

  constructor(private readonly repository: FeedbackRepository) {}

  async createTicket(
    actorId: string,
    actorEmail: string,
    dto: CreateFeedbackDto,
  ): Promise<{ id: string; ticketNumber: string; status: string }> {
    const sanitizedContent = sanitizeFeedbackMarkdown(dto.contentMarkdown);
    const searchText = toSearchText(sanitizedContent);

    // Every attachment is re-derived from file-service's own metadata rather
    // than trusted from the request. The client's filename, MIME type and size
    // are only a claim; storing the claim would let a caller label a file as
    // something it is not, and that label is what the download endpoint later
    // echoes as Content-Type.
    const attachments: FeedbackAttachment[] = [];
    for (const attachment of dto.attachments ?? []) {
      attachments.push(await this.verifyAttachment(actorId, attachment));
    }

    const ticketNumber = await this.repository.nextTicketNumber();
    const now = new Date();

    const historyEntry: FeedbackHistoryEntry = {
      action: 'CREATED',
      fromStatus: null,
      toStatus: FeedbackStatus.OPEN,
      actorId,
      actorEmail,
      note: null,
      at: now,
    };

    const created = await this.repository.create({
      ticketNumber,
      type: dto.type,
      title: sanitizeFeedbackPlainText(dto.title, FEEDBACK_MAX_TITLE_LENGTH),
      subject:
        dto.subject === undefined
          ? undefined
          : sanitizeFeedbackPlainText(dto.subject, FEEDBACK_MAX_SUBJECT_LENGTH),
      contentMarkdown: sanitizedContent,
      searchText,
      status: FeedbackStatus.OPEN,
      userId: actorId,
      reporterEmail: actorEmail,
      attachments,
      // Validated by the DTO and declared on the schema, but never written — so
      // every ticket showed Route, URL, Viewport and App version as N/A in the
      // admin dialog, which is exactly the context a triager needs to reproduce.
      pageContext: dto.pageContext,
      history: [historyEntry],
      lastActorId: actorId,
    });

    return { id: created.id, ticketNumber: created.ticketNumber, status: created.status };
  }

  async changeStatus(
    actorId: string,
    actorEmail: string,
    id: string,
    dto: UpdateFeedbackStatusDto,
  ): Promise<void> {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new BusinessException(
        'Feedback ticket not found',
        'FEEDBACK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const allowedTransitions = FEEDBACK_STATUS_TRANSITIONS[ticket.status] ?? [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BusinessException(
        `Cannot move a ticket from ${ticket.status} to ${dto.status}`,
        'FEEDBACK_INVALID_TRANSITION',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const patch: Partial<Record<string, string | Date | null>> = {
      status: dto.status,
      lastActorId: actorId,
      updatedAt: now,
    };

    if (dto.status === FeedbackStatus.RESOLVED) {
      patch.resolvedAt = now;
    } else if (dto.status === FeedbackStatus.CLOSED) {
      patch.closedAt = now;
    } else if (dto.status === FeedbackStatus.ARCHIVED) {
      patch.archivedAt = now;
    } else if (dto.status === FeedbackStatus.OPEN && ticket.status !== FeedbackStatus.OPEN) {
      patch.reopenedAt = now;
    }

    const historyEntry: FeedbackHistoryEntry = {
      action: 'STATUS_CHANGED',
      fromStatus: ticket.status,
      toStatus: dto.status,
      actorId,
      actorEmail,
      note: dto.note ?? null,
      at: now,
    };

    await this.repository.applyStatusChange(id, { set: patch, history: historyEntry });
  }

  async listForAdmin(query: ListFeedbackQueryDto) {
    return this.repository.findPaginated({ ...query, page: query.page, limit: query.limit });
  }

  async getForAdmin(id: string) {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new BusinessException(
        'Feedback ticket not found',
        'FEEDBACK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return ticket;
  }

  async listOwn(userId: string, query: ListFeedbackQueryDto) {
    return this.repository.findPaginated({
      ...query,
      page: query.page,
      limit: query.limit,
      userId,
    });
  }

  async getOwn(userId: string, id: string) {
    const ticket = await this.repository.findByIdForUser(id, userId);
    if (!ticket) {
      throw new BusinessException(
        'Feedback ticket not found',
        'FEEDBACK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return ticket;
  }

  async statusCounts() {
    return this.repository.countsByStatus();
  }

  async streamAttachment(ticketId: string, fileId: string, res: Response): Promise<void> {
    const ticket = await this.repository.findById(ticketId);
    if (!ticket) {
      throw new BusinessException(
        'Feedback ticket not found',
        'FEEDBACK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const attachment = ticket.attachments.find((a) => a.fileId === fileId);
    if (!attachment) {
      throw new BusinessException(
        'Feedback ticket not found',
        'FEEDBACK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const config = AppConfig.get();
    const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/download-internal/${encodeURIComponent(fileId)}`;
    const token = config.INTER_SERVICE_AUTH_TOKEN;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Service ${token}`,
        },
      });

      if (!response.ok || !response.body) {
        this.logger.error('Failed to fetch attachment from file service');
        throw new BusinessException(
          'Attachment could not be read',
          'FEEDBACK_ATTACHMENT_UNAVAILABLE',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // The stored mimeType was checked against the image-only allowlist when
      // the ticket was created, so it is safe to echo. nosniff stops a browser
      // from ignoring it and sniffing the bytes into something executable, and
      // the CSP makes the response inert even if it ever is rendered as a
      // document. Both matter because admins open these in their own session.
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', 'inline');

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      // Never log the token, the request headers or the file bytes.
      this.logger.error(
        `streamAttachment: ticket=${ticketId} file=${fileId} failed — ${(error as Error).message}`,
      );
      throw new BusinessException(
        'Attachment could not be read',
        'FEEDBACK_ATTACHMENT_UNAVAILABLE',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async verifyAttachment(
    actorId: string,
    attachment: FeedbackAttachment,
  ): Promise<FeedbackAttachment> {
    const config = AppConfig.get();
    const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/metadata-internal/${encodeURIComponent(attachment.fileId)}`;
    const token = config.INTER_SERVICE_AUTH_TOKEN;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Service ${token}`,
      },
    });

    if (!response.ok) {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = this.parseAttachmentMetadata(await response.text());

    if (metadata.userId !== actorId) {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !(FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(metadata.mimeType)
    ) {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (metadata.sizeBytes > FEEDBACK_MAX_ATTACHMENT_BYTES) {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    // file-service is the authority on what this file actually is. Only the
    // caller's isScreenshot flag is kept, because that is presentation, not a
    // claim about the bytes. The filename is reduced to its basename so a
    // traversal-shaped name can never be echoed into a header or a path.
    return {
      fileId: attachment.fileId,
      filename: basename(metadata.filename),
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      isScreenshot: attachment.isScreenshot,
    };
  }

  /**
   * file-service answers 200 with an empty body when the id does not exist, so
   * an ok status is not on its own evidence that a file is there. Parsing and
   * shape-checking here keeps a bogus attachment reference a 400 for the caller
   * instead of an unhandled SyntaxError surfacing as a 500, and guarantees the
   * ownership and MIME checks below run against a complete record.
   */
  private parseAttachmentMetadata(body: string): FileMetadataResponse {
    let payload: unknown;
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = fileMetadataResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BusinessException(
        'Attachment is not available',
        'FEEDBACK_ATTACHMENT_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsed.data;
  }
}
