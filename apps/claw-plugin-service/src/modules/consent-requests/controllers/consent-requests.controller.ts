import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CONSENT_CACHE_CONTROL } from '../constants/consent-requests.constants';
import {
  type DecisionBody,
  decisionBodySchema,
  type ListQuery,
  listQuerySchema,
  requestIdSchema,
} from '../dto/consent-request.dto';
import { ConsentRequestsService } from '../services/consent-requests.service';
import { type ChatGrantView, type ConsentRequestView } from '../types/consent-request.types';

const REQUEST_ID_PIPE = new ZodValidationPipe(requestIdSchema);

/**
 * The browser's side of the in-chat consent card, for the JWT user only. Every answer is
 * `private, no-store`: it names the arguments the model wants to send.
 */
@Controller('plugins/consent-requests')
export class ConsentRequestsController {
  constructor(private readonly service: ConsentRequestsService) {}

  /** The open questions (optionally of one conversation): how the card comes back after a reload. */
  @Get()
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', CONSENT_CACHE_CONTROL)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ): Promise<ConsentRequestView[]> {
    return this.service.listPending(user.id, query.conversationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', CONSENT_CACHE_CONTROL)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', REQUEST_ID_PIPE) id: string,
  ): Promise<ConsentRequestView> {
    return this.service.get(user.id, id);
  }

  @Post(':id/decision')
  @HttpCode(200)
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', CONSENT_CACHE_CONTROL)
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', REQUEST_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(decisionBodySchema)) body: DecisionBody,
  ): Promise<ConsentRequestView> {
    return this.service.decide(user.id, id, body);
  }
}

/** "Allow for this chat" grants: listed so the Installed page can show and revoke them. */
@Controller('plugins/chat-grants')
export class ChatGrantsController {
  constructor(private readonly service: ConsentRequestsService) {}

  @Get()
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', CONSENT_CACHE_CONTROL)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ChatGrantView[]> {
    return this.service.listGrants(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_USE)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', REQUEST_ID_PIPE) id: string,
  ): Promise<void> {
    await this.service.revokeGrant(user.id, id);
  }
}
