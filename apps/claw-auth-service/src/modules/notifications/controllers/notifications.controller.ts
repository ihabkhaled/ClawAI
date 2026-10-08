import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type NotificationIdParamDto,
  notificationIdParamSchema,
  type NotificationListQueryDto,
  notificationListQuerySchema,
  type NotificationPreferencesDto,
  notificationPreferencesSchema,
} from '../dto/notifications.dto';
import { NotificationsService } from '../services/notifications.service';
import type { NotificationPage, NotificationPreferencesView } from '../types/notifications.types';

/**
 * The signed-in person's own notifications.
 *
 * Ownership comes from the JWT; no route takes a user id, so there is nothing to enumerate. The
 * id in `:id/read` is only ever matched together with the caller's id, so another person's
 * notification id reads as "nothing to mark".
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: NotificationListQueryDto,
  ): Promise<NotificationPage> {
    return this.notifications.getPage(user.id, query);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<NotificationPreferencesView> {
    return this.notifications.getPreferences(user.id);
  }

  @Put('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(notificationPreferencesSchema)) body: NotificationPreferencesDto,
  ): Promise<NotificationPreferencesView> {
    return this.notifications.updatePreferences(user.id, body);
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() user: AuthenticatedUser): Promise<{ unreadCount: number }> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(notificationIdParamSchema)) params: NotificationIdParamDto,
  ): Promise<{ unreadCount: number }> {
    return this.notifications.markRead(user.id, params.id);
  }
}
