import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../common/guards/service-token.guard';
import { AgentTerminalSeedService } from '../services/agent-terminal-seed.service';
import type { SeedCommandInput } from '../types/seed-command.types';

/**
 * Service-to-service only. `@Public()` lifts the user JWT; the class-level ServiceTokenGuard is the
 * real check (security audit 2026-11-27: seed-command had no guard and queued a terminal command
 * for any userId it was given).
 */
@UseGuards(ServiceTokenGuard)
@Controller('internal/agent/terminal')
export class AgentTerminalInternalController {
  constructor(private readonly service: AgentTerminalSeedService) {}

  /**
   * Stream 41 — service-to-service entry-point used by claw-workspace-service
   * to seed an IMPL_PROMPT brief into the agent's PENDING_APPROVAL terminal-
   * command queue. Requires an active agent session (CONNECTED) for the user;
   * if none, returns 409 NO_ACTIVE_AGENT_DEVICE so the caller can fall back to
   * CHAT mode.
   */
  @Public()
  @Post('seed-command')
  @HttpCode(HttpStatus.CREATED)
  async seedCommand(@Body() body: SeedCommandInput): Promise<{ terminalCommandId: string }> {
    return this.service.seedCommand(body);
  }
}
