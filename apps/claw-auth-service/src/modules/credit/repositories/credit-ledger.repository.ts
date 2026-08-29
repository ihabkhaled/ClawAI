import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreditLedgerEntry, CreditLedgerKind } from '../../../generated/prisma';
import { type CreditLedgerPageQuery } from '../types/credit.types';

/**
 * Read access to the append-only ledger.
 *
 * There is deliberately no `update` or `delete` here. A correction is a new
 * compensating row, written through `CreditWalletRepository.applyMovements` so
 * it can never land without the matching balance change. Exposing an update
 * from this class would make that guarantee optional.
 */
@Injectable()
export class CreditLedgerRepository {
  private readonly logger = new Logger(CreditLedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page, newest first, keyset-paginated on `(occurredAt, id)`.
   *
   * Keyset rather than OFFSET because the ledger grows while a user is reading
   * it: an offset page would silently repeat or skip a row every time a request
   * settled mid-scroll, and a customer auditing their own spend is precisely
   * the person who will notice. Takes `limit + 1` so "is there another page" is
   * answered without a second COUNT over a table that grows per request.
   */
  async findPage(query: CreditLedgerPageQuery): Promise<CreditLedgerEntry[]> {
    this.logger.debug(`findPage: user=${query.userId} limit=${query.limit}`);
    return this.prisma.creditLedgerEntry.findMany({
      where: { userId: query.userId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor === null ? {} : { cursor: { id: query.cursor }, skip: 1 }),
    });
  }

  /**
   * The spend attribution recorded when the hold was taken.
   *
   * Read back at settlement because the durable reservation row does not carry
   * a surface, and a CONSUMPTION line with no surface makes "where did my $5
   * go" unanswerable — which becomes a support ticket and then a chargeback.
   * One indexed lookup, and it happens AFTER the user already has their answer.
   */
  async findReservationAttribution(
    reservationId: string,
  ): Promise<{ surface: string | null; workflow: string | null } | null> {
    this.logger.debug(`findReservationAttribution: reservation=${reservationId}`);
    return this.prisma.creditLedgerEntry.findFirst({
      where: { reservationId, kind: CreditLedgerKind.RESERVATION },
      select: { surface: true, workflow: true },
    });
  }

  async findByReservationId(reservationId: string): Promise<CreditLedgerEntry[]> {
    this.logger.debug(`findByReservationId: reservation=${reservationId}`);
    return this.prisma.creditLedgerEntry.findMany({
      where: { reservationId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
