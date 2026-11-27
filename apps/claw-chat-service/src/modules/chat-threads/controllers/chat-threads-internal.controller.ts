import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { MessageRole } from '../../../generated/prisma';
import { type SeedThreadInput } from '../types/chat-threads.types';

/**
 * Service-to-service only. `@Public()` lifts the user JWT; the class-level ServiceTokenGuard is the
 * real check (security audit 2026-11-27: threads/seeded had no guard and wrote a thread and a
 * message for any userId it was given).
 */
@UseGuards(ServiceTokenGuard)
@Controller('internal/chat')
export class ChatThreadsInternalController {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly messages: ChatMessagesRepository,
  ) {}

  /**
   * Stream 41 — service-to-service entry-point used by claw-workspace-service
   * during IMPL_PROMPT handoff. Creates a fresh thread + posts the initial
   * user message verbatim. Returns the thread id so the caller can deep-link.
   */
  @Public()
  @Post('threads/seeded')
  @HttpCode(HttpStatus.CREATED)
  async seedThread(@Body() body: SeedThreadInput): Promise<{ threadId: string }> {
    const thread = await this.threads.create({
      userId: body.userId,
      title: body.title ?? 'Implementation brief',
      systemPrompt: body.systemPrompt,
    });
    await this.messages.create({
      threadId: thread.id,
      role: MessageRole.USER,
      content: body.initialUserMessage,
    });
    return { threadId: thread.id };
  }
}
