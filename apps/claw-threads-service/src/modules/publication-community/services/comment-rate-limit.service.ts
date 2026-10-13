import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import {
  COMMENT_RATE_LIMIT_ERROR_CODE,
  COMMENT_RATE_LIMIT_MAX,
  COMMENT_RATE_LIMIT_WINDOW_MS,
} from '../constants/comment-rate-limit.constants';
import { CommentRateRepository } from '../repositories/comment-rate.repository';

@Injectable()
export class CommentRateLimitService {
  constructor(private readonly repository: CommentRateRepository) {}

  /** Throws 429 with a coded body when the user already posted the maximum in the window. */
  async assertAllowed(userId: string, now: Date = new Date()): Promise<void> {
    const since = new Date(now.getTime() - COMMENT_RATE_LIMIT_WINDOW_MS);
    const recent = await this.repository.countSince(userId, since);
    if (recent >= COMMENT_RATE_LIMIT_MAX) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: COMMENT_RATE_LIMIT_ERROR_CODE,
          message: 'Too many comments, try again shortly',
          retryAfterSeconds: Math.ceil(COMMENT_RATE_LIMIT_WINDOW_MS / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
