import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { AgentTerminalSeedService } from '../services/agent-terminal-seed.service';
import type { SeedCommandInput } from '../types/seed-command.types';

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
