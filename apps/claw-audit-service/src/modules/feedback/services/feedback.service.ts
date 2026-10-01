import { Injectable } from '@nestjs/common';
import { type Response } from 'express';
import { FeedbackManager } from '../managers/feedback.manager';
import { FeedbackPublicManager } from '../managers/feedback-public.manager';
import { type CreatePublicFeedbackDto } from '../dto/create-public-feedback.dto';
import { type CreateFeedbackDto } from '../dto/create-feedback.dto';
import { type ListFeedbackQueryDto } from '../dto/list-feedback-query.dto';
import { type UpdateFeedbackStatusDto } from '../dto/update-feedback-status.dto';
import { type FeedbackTicketDocument } from '../schemas/feedback-ticket.schema';
import {
  type CreateFeedbackResult,
  type CreatePublicFeedbackResult,
  type FeedbackPaginatedTickets,
} from '../types/feedback.types';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly feedbackManager: FeedbackManager,
    private readonly publicManager: FeedbackPublicManager,
  ) {}

  createTicket(
    userId: string,
    userEmail: string,
    dto: CreateFeedbackDto,
  ): Promise<CreateFeedbackResult> {
    return this.feedbackManager.createTicket(userId, userEmail, dto);
  }

  createPublicTicket(
    clientIp: string,
    dto: CreatePublicFeedbackDto,
  ): Promise<CreatePublicFeedbackResult> {
    return this.publicManager.createTicket(clientIp, dto);
  }

  changeStatus(
    userId: string,
    userEmail: string,
    id: string,
    dto: UpdateFeedbackStatusDto,
  ): Promise<void> {
    return this.feedbackManager.changeStatus(userId, userEmail, id, dto);
  }

  listForAdmin(
    query: ListFeedbackQueryDto,
  ): Promise<FeedbackPaginatedTickets<FeedbackTicketDocument>> {
    return this.feedbackManager.listForAdmin(query);
  }

  getForAdmin(id: string): Promise<FeedbackTicketDocument> {
    return this.feedbackManager.getForAdmin(id);
  }

  listOwn(
    userId: string,
    query: ListFeedbackQueryDto,
  ): Promise<FeedbackPaginatedTickets<FeedbackTicketDocument>> {
    return this.feedbackManager.listOwn(userId, query);
  }

  getOwn(userId: string, id: string): Promise<FeedbackTicketDocument> {
    return this.feedbackManager.getOwn(userId, id);
  }

  statusCounts(): Promise<Record<string, number>> {
    return this.feedbackManager.statusCounts();
  }

  streamAttachment(id: string, fileId: string, res: Response): Promise<void> {
    return this.feedbackManager.streamAttachment(id, fileId, res);
  }
}
