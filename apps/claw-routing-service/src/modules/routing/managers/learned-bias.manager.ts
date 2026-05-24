// SCAFFOLD: stream R.1 (01-r1-learning-loop) — replace this stub with real implementation before activation.
// See docs/15-ai-context/routing-flagship-streams/01-r1-learning-loop.md
//
// NOT registered in routing.module.ts — discoverable but inert.

import { Injectable, Logger } from '@nestjs/common';

import type { BiasInput, BiasOutput } from '../types/learned-bias.types';

@Injectable()
export class LearnedBiasManager {
  private readonly logger = new Logger(LearnedBiasManager.name);

  async applyBias(_input: BiasInput): Promise<BiasOutput> {
    this.logger.warn('LearnedBiasManager.applyBias: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R1 — LearnedBiasManager.applyBias not implemented; see docs/15-ai-context/routing-flagship-streams/01-r1-learning-loop.md',
    );
  }
}
