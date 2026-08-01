import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MARKETING_NEWEST_MODELS } from '@/constants/subscription-marketing.constants';

describe('MARKETING_NEWEST_MODELS', () => {
  it('shows six to eight models backed by the canonical cloud catalog', () => {
    const catalogPath = path.resolve(
      process.cwd(),
      '../claw-connector-service/src/modules/connectors/constants/ollama-cloud-models.constants.ts',
    );
    const catalogSource = fs.readFileSync(catalogPath, 'utf8');

    expect(MARKETING_NEWEST_MODELS.length).toBeGreaterThanOrEqual(6);
    expect(MARKETING_NEWEST_MODELS.length).toBeLessThanOrEqual(8);
    expect(new Set(MARKETING_NEWEST_MODELS.map((model) => model.id)).size).toBe(
      MARKETING_NEWEST_MODELS.length,
    );
    for (const model of MARKETING_NEWEST_MODELS) {
      expect(catalogSource).toContain(`'${model.id}'`);
    }
  });
});
