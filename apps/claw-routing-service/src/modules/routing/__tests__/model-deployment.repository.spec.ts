import { DeploymentActivationState, PrivacyClass, RouterProvider } from '../../../generated/prisma';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ModelDeploymentRepository } from '../repositories/model-deployment.repository';

const buildRepo = (
  findMany: jest.Mock = jest.fn().mockResolvedValue([]),
): { repository: ModelDeploymentRepository; findMany: jest.Mock } => {
  const prisma = { modelDeployment: { findMany } };
  return {
    repository: new ModelDeploymentRepository(prisma as unknown as PrismaService),
    findMany,
  };
};

describe('ModelDeploymentRepository.findEligibleForCloudRouting', () => {
  it('queries with the hard privacy-class and activation-state filter', async () => {
    const { repository, findMany } = buildRepo();

    await repository.findEligibleForCloudRouting();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        privacyClass: { in: [PrivacyClass.PUBLIC_OK, PrivacyClass.CLOUD_PERMITTED] },
        activationState: DeploymentActivationState.ACTIVE,
      },
      select: { id: true, provider: true, providerModelId: true },
    });
  });

  it('never queries for LOCAL_ONLY or LOCAL_PREFERRED', async () => {
    const { repository, findMany } = buildRepo();

    await repository.findEligibleForCloudRouting();

    const where = findMany.mock.calls[0]?.[0]?.where as { privacyClass: { in: PrivacyClass[] } };
    expect(where.privacyClass.in).not.toContain(PrivacyClass.LOCAL_ONLY);
    expect(where.privacyClass.in).not.toContain(PrivacyClass.LOCAL_PREFERRED);
  });

  it('returns the rows the query resolves, unmodified', async () => {
    const rows = [
      { id: 'dep_1', provider: RouterProvider.GEMINI, providerModelId: 'gemini-2.5-flash' },
    ];
    const { repository } = buildRepo(jest.fn().mockResolvedValue(rows));

    const result = await repository.findEligibleForCloudRouting();

    expect(result).toEqual(rows);
  });
});
