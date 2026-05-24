// SCAFFOLD: stream R.5 (06-r5-operator-playground)

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);

  async evaluate(_body: unknown): Promise<unknown> {
    this.logger.warn('PlaygroundService.evaluate: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R5 — PlaygroundService.evaluate not implemented; see docs/15-ai-context/routing-flagship-streams/06-r5-operator-playground.md',
    );
  }
}
