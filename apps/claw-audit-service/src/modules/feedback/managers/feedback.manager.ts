import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { type Response } from 'express';
import { FeedbackStatus } from '@claw/shared-types';
import {
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_STATUS_TRANSITIONS,
} from '@claw/shared-constants';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { sanitizeFeedbackMarkdown, toSearchText } from '../sanitizers/feedback-markdown.sanitizer';
import { type CreateFeedbackDto } from '../dto/create-feedback.dto';
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

    if (dto.attachments && dto.attachments.length > 0) {
      for (const attachment of dto.attachments) {
        await this.verifyAttachment(actorId, attachment);
      }
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
      title: dto.title,
      contentMarkdown: sanitizedContent,
      searchText,
      status: FeedbackStatus.OPEN,
      userId: actorId,
      reporterEmail: actorEmail,
      attachments: dto.attachments ?? [],
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

      res.setHeader('Content-Type', attachment.mimeType);
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

  private async verifyAttachment(actorId: string, attachment: FeedbackAttachment): Promise<void> {
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

    const metadata = (await response.json()) as FileMetadataResponse;

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
  }
}
