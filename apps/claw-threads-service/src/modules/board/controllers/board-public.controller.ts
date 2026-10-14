import { Controller, Get, Header, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  BOARD_PUBLIC_LIST_CACHE_CONTROL,
  BOARD_PUBLIC_LIST_RATE_LIMIT_PER_MINUTE,
  BOARD_PUBLIC_SUGGEST_CACHE_CONTROL,
  BOARD_PUBLIC_SUGGEST_RATE_LIMIT_PER_MINUTE,
  BOARD_PUBLIC_VARY,
  BOARD_RATE_LIMIT_WINDOW_MS,
} from '../constants/board.constants';
import {
  type BoardListQuery,
  boardListQuerySchema,
  type BoardSuggestQuery,
  boardSuggestQuerySchema,
} from '../dto/board-query.dto';
import { BoardService } from '../services/board.service';

/**
 * The marketing-site Board for guests (ADR-177 addendum). It calls the same service methods as the
 * signed-in `BoardController`, so the SQL, visibility predicate, query contract and error codes cannot
 * drift. It never reads a counter write path: a Board read does not count as a view.
 * Registered before `PublicationPublicController` (`public/:slug`) in `AppModule`, or `public/board`
 * would be read as a slug.
 */
@Public()
@Controller('thread-publications/public/board')
export class BoardPublicController {
  constructor(private readonly board: BoardService) {}

  @Get()
  @Throttle({
    default: { limit: BOARD_PUBLIC_LIST_RATE_LIMIT_PER_MINUTE, ttl: BOARD_RATE_LIMIT_WINDOW_MS },
  })
  @Header('Cache-Control', BOARD_PUBLIC_LIST_CACHE_CONTROL)
  @Header('Vary', BOARD_PUBLIC_VARY)
  list(
    @Query(new ZodValidationPipe(boardListQuerySchema)) query: BoardListQuery,
  ): ReturnType<BoardService['list']> {
    return this.board.list(null, query);
  }

  @Get('suggest')
  @Throttle({
    default: { limit: BOARD_PUBLIC_SUGGEST_RATE_LIMIT_PER_MINUTE, ttl: BOARD_RATE_LIMIT_WINDOW_MS },
  })
  @Header('Cache-Control', BOARD_PUBLIC_SUGGEST_CACHE_CONTROL)
  @Header('Vary', BOARD_PUBLIC_VARY)
  suggest(
    @Query(new ZodValidationPipe(boardSuggestQuerySchema)) query: BoardSuggestQuery,
  ): ReturnType<BoardService['suggest']> {
    return this.board.suggest(query);
  }
}
