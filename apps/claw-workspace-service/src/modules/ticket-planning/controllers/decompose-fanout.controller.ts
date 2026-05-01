import { CurrentUser } from '@claw/shared-auth';
import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { DecomposeFanoutManager } from '../managers/decompose-fanout.manager';
import type { FanoutResult as FanoutResponse } from '../types/decompose-fanout.types';

@Controller('workspace/decompose-fanout')
export class DecomposeFanoutController {
  constructor(private readonly manager: DecomposeFanoutManager) {}

  @Post('queue/:queueId')
  @HttpCode(HttpStatus.CREATED)
  async fanout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('queueId') queueId: string,
  ): Promise<FanoutResponse> {
    return this.manager.fanout({ queueId, userId: user.id });
  }
}
