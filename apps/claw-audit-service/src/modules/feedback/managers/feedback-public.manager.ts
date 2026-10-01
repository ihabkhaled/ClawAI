import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FeedbackStatus } from '@claw/shared-types';
import { FEEDBACK_MAX_TITLE_LENGTH } from '@claw/shared-constants';
import { FeedbackSource } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  FEEDBACK_PUBLIC_ACTOR_ID,
  FEEDBACK_PUBLIC_DERIVED_TITLE_LENGTH,
  FEEDBACK_PUBLIC_EMAIL_LIMIT,
  FEEDBACK_PUBLIC_IP_LIMIT,
  FEEDBACK_PUBLIC_LOCALE_MAX_LENGTH,
  FEEDBACK_PUBLIC_NAME_MAX_LENGTH,
  FEEDBACK_PUBLIC_PAGE_URL_MAX_LENGTH,
} from '../constants/feedback-public.constants';
import { type CreatePublicFeedbackDto } from '../dto/create-public-feedback.dto';
import { FeedbackRateLimitRepository } from '../repositories/feedback-rate-limit.repository';
import { FeedbackRepository } from '../repositories/feedback.repository';
import {
  sanitizeFeedbackMarkdown,
  sanitizeFeedbackPlainText,
  toSearchText,
} from '../sanitizers/feedback-markdown.sanitizer';
import {
  type CreatePublicFeedbackResult,
  type FeedbackHistoryEntry,
  type FeedbackPageContext,
} from '../types/feedback.types';
import { deriveTitle } from '../utilities/feedback-text.utility';

/**
 * The no-login submission path. Everything the caller says about who they are
 * is a claim: it is stored as a claim (source=PUBLIC, userId null) and never
 * looked up against accounts, so the answer cannot reveal whether an address
 * belongs to one (rule 43).
 */
@Injectable()
export class FeedbackPublicManager {
  private readonly logger = new Logger(FeedbackPublicManager.name);

  constructor(
    private readonly repository: FeedbackRepository,
    private readonly rateLimits: FeedbackRateLimitRepository,
  ) {}

  async createTicket(
    clientIp: string,
    dto: CreatePublicFeedbackDto,
  ): Promise<CreatePublicFeedbackResult> {
    // A filled honeypot gets the normal answer and nothing is stored or counted.
    if ((dto.website ?? '').trim().length > 0) {
      this.logger.warn('public feedback honeypot tripped, submission discarded');
      return { id: randomBytes(12).toString('hex') };
    }

    await this.enforceLimits(clientIp, dto.email);

    const content = sanitizeFeedbackMarkdown(dto.message);
    const title =
      dto.title !== undefined && dto.title.length > 0
        ? dto.title
        : deriveTitle(dto.message, FEEDBACK_PUBLIC_DERIVED_TITLE_LENGTH);
    const now = new Date();
    const history: FeedbackHistoryEntry = {
      action: 'CREATED',
      fromStatus: null,
      toStatus: FeedbackStatus.OPEN,
      actorId: FEEDBACK_PUBLIC_ACTOR_ID,
      actorEmail: dto.email,
      note: null,
      at: now,
    };

    const created = await this.repository.create({
      ticketNumber: await this.repository.nextTicketNumber(),
      type: dto.type,
      title: sanitizeFeedbackPlainText(title, FEEDBACK_MAX_TITLE_LENGTH),
      subject: undefined,
      contentMarkdown: content,
      searchText: toSearchText(content),
      status: FeedbackStatus.OPEN,
      source: FeedbackSource.PUBLIC,
      userId: null,
      reporterName: sanitizeFeedbackPlainText(dto.name, FEEDBACK_PUBLIC_NAME_MAX_LENGTH),
      reporterEmail: dto.email,
      attachments: [],
      pageContext: this.pageContext(dto),
      history: [history],
      lastActorId: FEEDBACK_PUBLIC_ACTOR_ID,
    });

    // The id only. Not the ticket number, the status or the email.
    return { id: created.id };
  }

  private pageContext(dto: CreatePublicFeedbackDto): FeedbackPageContext | undefined {
    return dto.pageUrl === undefined && dto.locale === undefined
      ? undefined
      : {
          url:
            dto.pageUrl === undefined
              ? undefined
              : sanitizeFeedbackPlainText(dto.pageUrl, FEEDBACK_PUBLIC_PAGE_URL_MAX_LENGTH),
          locale:
            dto.locale === undefined
              ? undefined
              : sanitizeFeedbackPlainText(dto.locale, FEEDBACK_PUBLIC_LOCALE_MAX_LENGTH),
        };
  }

  // Both counters are bumped for every submission, so which one tripped is not
  // observable and neither depends on whether the email belongs to an account.
  private async enforceLimits(clientIp: string, email: string): Promise<void> {
    const [ipHits, emailHits] = await Promise.all([
      this.rateLimits.hitIp(clientIp),
      this.rateLimits.hitEmail(email),
    ]);
    if (ipHits > FEEDBACK_PUBLIC_IP_LIMIT || emailHits > FEEDBACK_PUBLIC_EMAIL_LIMIT) {
      throw new BusinessException(
        'Too many feedback submissions. Please try again later.',
        'FEEDBACK_RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
