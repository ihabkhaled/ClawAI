import { Controller, Get, Header, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  BOARD_LIST_RATE_LIMIT_PER_MINUTE,
  BOARD_RATE_LIMIT_WINDOW_MS,
  BOARD_SUGGEST_CACHE_CONTROL,
  BOARD_SUGGEST_RATE_LIMIT_PER_MINUTE,
} from '../constants/board.constants';
import {
  type BoardListQuery,
  boardListQuerySchema,
  type BoardSuggestQuery,
  boardSuggestQuerySchema,
} from '../dto/board-query.dto';
import { BoardService } from '../services/board.service';

@Controller('thread-publications/board')
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get()
  @Throttle({
    default: { limit: BOARD_LIST_RATE_LIMIT_PER_MINUTE, ttl: BOARD_RATE_LIMIT_WINDOW_MS },
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(boardListQuerySchema)) query: BoardListQuery,
  ): ReturnType<BoardService['list']> {
    return this.board.list(user.id, query);
  }

  @Get('suggest')
  @Throttle({
    default: { limit: BOARD_SUGGEST_RATE_LIMIT_PER_MINUTE, ttl: BOARD_RATE_LIMIT_WINDOW_MS },
  })
  @Header('Cache-Control', BOARD_SUGGEST_CACHE_CONTROL)
  @Header('Vary', 'Authorization')
  suggest(
    @Query(new ZodValidationPipe(boardSuggestQuerySchema)) query: BoardSuggestQuery,
  ): ReturnType<BoardService['suggest']> {
    return this.board.suggest(query);
  }
}
