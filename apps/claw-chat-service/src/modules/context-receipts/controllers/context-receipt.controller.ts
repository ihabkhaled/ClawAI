import { Controller, Get, Param } from '@nestjs/common';
import type { ContextReceipt } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { ContextReceiptService } from '../services/context-receipt.service';

@Controller('chat-messages')
export class ContextReceiptController {
  constructor(private readonly service: ContextReceiptService) {}

  @Get(':id/context-receipt')
  async getReceipt(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextReceipt> {
    return this.service.getByMessageId(id, user.id);
  }
}
