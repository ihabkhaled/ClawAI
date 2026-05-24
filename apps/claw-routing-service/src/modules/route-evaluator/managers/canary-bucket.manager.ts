// SCAFFOLD: stream R.1/R.3 (02-r1r3-v2-evaluator-canary) — replace with real implementation before activation.
// See docs/15-ai-context/routing-flagship-streams/02-r1r3-v2-evaluator-canary.md
//
// NOT registered in route-evaluator.module.ts — discoverable but inert.

import { Injectable, Logger } from '@nestjs/common';

import type { CanaryBucketInput, CanaryBucketResult } from '../types/canary.types';

@Injectable()
export class CanaryBucketManager {
  private readonly logger = new Logger(CanaryBucketManager.name);

  isV2Bucket(_input: CanaryBucketInput): CanaryBucketResult {
    this.logger.warn('CanaryBucketManager.isV2Bucket: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R1/R3 — CanaryBucketManager.isV2Bucket not implemented; see docs/15-ai-context/routing-flagship-streams/02-r1r3-v2-evaluator-canary.md',
    );
  }
}
