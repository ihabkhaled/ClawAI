import { Injectable } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { ResearchManager } from '../managers/research.manager';
import type { ResearchRun } from '../../../generated/prisma';

@Injectable()
export class ResearchService {
  constructor(private readonly manager: ResearchManager) {}

  async getRunOrThrow(id: string, userId: string): Promise<ResearchRun> {
    const run = await this.manager.getRun(id, userId);
    if (run === null) {
      throw new EntityNotFoundException('ResearchRun', id);
    }
    return run;
  }
}
