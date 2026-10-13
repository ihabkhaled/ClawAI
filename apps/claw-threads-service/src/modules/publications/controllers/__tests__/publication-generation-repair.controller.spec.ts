import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { repairOrphanGenerationsSchema } from '../../dto/repair-orphan-generations.dto';
import { PublicationGenerationRepairController } from '../publication-generation-repair.controller';

describe('PublicationGenerationRepairController', () => {
  it('hands the validated batch to the repair service', async () => {
    const repair = { repair: vi.fn().mockResolvedValue([{ jobId: 'j', outcome: 'CANCELLED' }]) };
    const controller = new PublicationGenerationRepairController(repair as never);
    const body = { jobs: [{ jobId: 'j', ownerId: 'o' }] };

    await expect(controller.repairOrphans(body)).resolves.toEqual([
      { jobId: 'j', outcome: 'CANCELLED' },
    ]);
    expect(repair.repair).toHaveBeenCalledWith(body);
  });

  it('is reserved for moderators', () => {
    const required: unknown = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      PublicationGenerationRepairController,
    );

    expect(required).toEqual([Permission.THREAD_PUBLICATIONS_MODERATE]);
  });
});

describe('repairOrphanGenerationsSchema', () => {
  it('needs at least one job and at most fifty', () => {
    const job = { jobId: 'j', ownerId: 'o' };

    expect(repairOrphanGenerationsSchema.safeParse({ jobs: [] }).success).toBe(false);
    expect(repairOrphanGenerationsSchema.safeParse({ jobs: [job] }).success).toBe(true);
    expect(
      repairOrphanGenerationsSchema.safeParse({ jobs: Array.from({ length: 50 }, () => job) })
        .success,
    ).toBe(true);
    expect(
      repairOrphanGenerationsSchema.safeParse({ jobs: Array.from({ length: 51 }, () => job) })
        .success,
    ).toBe(false);
  });

  it('rejects unknown fields and unstorable text', () => {
    expect(
      repairOrphanGenerationsSchema.safeParse({ jobs: [{ jobId: 'j', ownerId: 'o', extra: 1 }] })
        .success,
    ).toBe(false);
    expect(
      repairOrphanGenerationsSchema.safeParse({
        jobs: [{ jobId: `j${String.fromCharCode(0)}`, ownerId: 'o' }],
      }).success,
    ).toBe(false);
  });
});
