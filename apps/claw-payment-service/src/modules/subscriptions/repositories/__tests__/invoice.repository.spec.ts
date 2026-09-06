import { InvoiceStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { INVOICE_LIST_LIMIT, PAID_INVOICE_SCAN_LIMIT } from '../../constants/subscriptions.constants';
import { InvoiceRepository } from '../invoice.repository';

type InvoiceDelegate = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
};

// A Prisma delegate has far more methods than a repository calls, so the stub
// is grafted onto an empty object rather than declared as the full delegate
// type. Object.create hands back an untyped object, which is what lets the
// double type assertion this codebase bans stay out of the test.
function buildPrisma(): { prisma: PrismaService; invoice: InvoiceDelegate } {
  const invoice: InvoiceDelegate = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
  };
  const prisma: PrismaService = Object.create(null);
  Object.assign(prisma, { invoice });
  return { prisma, invoice };
}

describe('InvoiceRepository', () => {
  let invoice: InvoiceDelegate;
  let repository: InvoiceRepository;

  beforeEach(() => {
    const built = buildPrisma();
    invoice = built.invoice;
    repository = new InvoiceRepository(built.prisma);
  });

  describe('listForUser', () => {
    it('scopes by userId at the query and bounds the result', async () => {
      await repository.listForUser('user_1');
      expect(invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { issuedAt: 'desc' },
        take: INVOICE_LIST_LIMIT,
      });
    });

    it('honours a caller-supplied cap', async () => {
      await repository.listForUser('user_1', 24);
      expect(invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 24, where: { userId: 'user_1' } }),
      );
    });
  });

  describe('listPaidForUser', () => {
    it('filters to PAID at the query, not after the bound is applied', async () => {
      // Taking 600 rows and dropping the unpaid ones afterwards would sum a
      // truncated set and understate what the customer paid.
      await repository.listPaidForUser('user_1');
      expect(invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1', status: InvoiceStatus.PAID },
        orderBy: { issuedAt: 'desc' },
        take: PAID_INVOICE_SCAN_LIMIT,
      });
    });

    it('honours a caller-supplied cap', async () => {
      await repository.listPaidForUser('user_1', 5);
      expect(invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it('returns an empty list rather than throwing for a user with no invoices', async () => {
      await expect(repository.listPaidForUser('user_none')).resolves.toEqual([]);
    });
  });

  describe('findOwned', () => {
    it('never looks an invoice up by id alone', async () => {
      await repository.findOwned('user_1', 'inv_1');
      expect(invoice.findFirst).toHaveBeenCalledWith({ where: { id: 'inv_1', userId: 'user_1' } });
    });
  });
});
