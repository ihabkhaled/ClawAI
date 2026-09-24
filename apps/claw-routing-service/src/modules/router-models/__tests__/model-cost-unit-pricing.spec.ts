import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { SeedApplyOutcome } from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { priceModelCostSchema, publishModelCostSchema } from '../dto/publish-model-cost.dto';
import { ModelCostRepository } from '../repositories/model-cost.repository';
import { ModelCostSeedRepository } from '../repositories/model-cost-seed.repository';
import { ModelCostSeedService } from '../services/model-cost-seed.service';

// Unit metering on the routing side: the dearest-rate fallback must never pick a
// per-unit row, a seed that re-priced a model busts auth's cached rate, and the
// admin/price DTOs carry the new per-character rate and unit counts.

describe('ModelCostRepository.findMostExpensiveForProvider', () => {
  it('only lets a TOKEN-priced row stand in for an unpriced chat model', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [
        ModelCostRepository,
        { provide: PrismaService, useValue: { modelCostVersion: { findFirst } } },
      ],
    }).compile();

    await module.get(ModelCostRepository).findMostExpensiveForProvider('OPENAI');

    // gpt-image-1 carries a $5/M input rate and a ZERO output rate (its money
    // is per image). Picked as the fallback, it would price an unknown chat
    // model's output at $0.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          provider: 'OPENAI',
          isActive: true,
          outputPerMillionMicroUsd: { gt: 0n },
          imagePerUnitMicroUsd: null,
          audioPerUnitMicroUsd: null,
          ttsPerCharacterMicroUsd: null,
        }),
      }),
    );
  });
});

describe('ModelCostSeedService — re-priced models', () => {
  it('publishes routing.model_cost.published for each re-priced model, identity only', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        ModelCostSeedService,
        {
          provide: ModelCostSeedRepository,
          useValue: {
            applyOnce: vi.fn().mockResolvedValue({
              outcome: SeedApplyOutcome.APPLIED,
              inserted: 0,
              skipped: 40,
              repriced: [{ provider: 'OPENAI', modelKey: 'gpt-image-1', version: 2 }],
            }),
          },
        },
        { provide: RabbitMQService, useValue: { publish } },
      ],
    }).compile();

    await module.get(ModelCostSeedService).seed();

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(EventPattern.ROUTING_MODEL_COST_PUBLISHED, {
      provider: 'OPENAI',
      modelKey: 'gpt-image-1',
      version: 2,
    });
  });

  it('survives a broker failure — the price is already committed', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ModelCostSeedService,
        {
          provide: ModelCostSeedRepository,
          useValue: {
            applyOnce: vi.fn().mockResolvedValue({
              outcome: SeedApplyOutcome.APPLIED,
              inserted: 0,
              skipped: 0,
              repriced: [{ provider: 'OPENAI', modelKey: 'dall-e-3', version: 2 }],
            }),
          },
        },
        {
          provide: RabbitMQService,
          useValue: { publish: vi.fn().mockRejectedValue(new Error('broker down')) },
        },
      ],
    }).compile();

    await expect(module.get(ModelCostSeedService).seed()).resolves.toMatchObject({
      outcome: SeedApplyOutcome.APPLIED,
    });
  });
});

describe('model-cost DTOs — unit metering fields', () => {
  it('accepts a per-character tts rate and defaults it to null', () => {
    const base = {
      provider: 'OPENAI',
      modelKey: 'tts-1',
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
    };
    expect(publishModelCostSchema.parse(base).ttsPerCharacterMicroUsd).toBeNull();
    expect(
      publishModelCostSchema.parse({ ...base, ttsPerCharacterMicroUsd: 15 })
        .ttsPerCharacterMicroUsd,
    ).toBe(15);
    expect(publishModelCostSchema.safeParse({ ...base, ttsPerCharacterMicroUsd: -1 }).success).toBe(
      false,
    );
  });

  it('prices audio seconds and tts characters, defaulting both to 0', () => {
    const parsed = priceModelCostSchema.parse({ provider: 'OPENAI', modelKey: 'whisper-1' });
    expect(parsed).toMatchObject({ audioSeconds: 0, ttsCharacters: 0, imageUnits: 0 });
    expect(
      priceModelCostSchema.safeParse({ provider: 'OPENAI', modelKey: 'x', audioSeconds: 7_201 })
        .success,
    ).toBe(false);
    expect(
      priceModelCostSchema.safeParse({ provider: 'OPENAI', modelKey: 'x', ttsCharacters: 1.5 })
        .success,
    ).toBe(false);
  });
});
