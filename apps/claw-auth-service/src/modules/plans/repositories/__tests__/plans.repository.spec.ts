import { PlanModelAccessMode } from '../../../../generated/prisma';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlansRepository } from '../plans.repository';

describe('PlansRepository model-access policy', () => {
  const plan = { id: 'plan-1', modelAccess: [] };
  const planUpdate = jest.fn();
  const accessDeleteMany = jest.fn();
  const accessCreateMany = jest.fn();
  const findUnique = jest.fn();
  const transaction = jest.fn();

  const prisma = {
    plan: { update: planUpdate, findUnique },
    planModelAccess: {
      deleteMany: accessDeleteMany,
      createMany: accessCreateMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    planUpdate.mockReturnValue(Promise.resolve(plan));
    accessDeleteMany.mockReturnValue(Promise.resolve({ count: 0 }));
    accessCreateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    transaction.mockResolvedValue([]);
    findUnique.mockResolvedValue(plan);
  });

  it('switches a customized plan to an explicit allow-list atomically', async () => {
    const repository = new PlansRepository(prisma);

    await repository.replaceModelAccess('plan-1', [
      {
        provider: 'OPENAI',
        model: 'gpt-4o',
        isAllowed: true,
        allowAsPrimary: true,
        allowAsFallback: true,
        allowAsJudge: true,
        allowInCompare: true,
      },
    ]);

    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { modelAccessMode: PlanModelAccessMode.ALLOW_LIST },
    });
    expect(accessCreateMany).toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('switches an empty customized plan to deny-all without an empty createMany', async () => {
    const repository = new PlansRepository(prisma);

    await repository.replaceModelAccess('plan-1', []);

    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { modelAccessMode: PlanModelAccessMode.DENY_ALL },
    });
    expect(accessCreateMany).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
