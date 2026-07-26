import { InvoiceLineKind } from '@claw/shared-types';

import { type InvoiceLineInput } from '../types/billing-record.types';
import { type InvoiceTotals } from '../types/invoice-total.types';

/**
 * Sums invoice lines into the header totals.
 *
 * The invariant this enforces is that lines ALWAYS sum to the total: the total is
 * derived here, never supplied by a caller, so an invoice whose header disagrees
 * with its own lines cannot be created.
 *
 * All integer arithmetic in minor units. No float ever touches a money value —
 * `0.1 + 0.2` is not `0.3`, and a cent of drift per invoice is a reconciliation
 * discrepancy that compounds.
 *
 * Credits, discounts and refunds carry negative amounts and are reported both in
 * their own bucket (positive magnitude, for display) and in the total (signed).
 */
export function sumInvoiceLines(lines: ReadonlyArray<InvoiceLineInput>): InvoiceTotals {
  let subtotalMinor = 0;
  let discountMinor = 0;
  let taxMinor = 0;
  let totalMinor = 0;

  for (const line of lines) {
    const lineTotal = line.amountMinor * line.quantity;
    totalMinor += lineTotal;

    if (line.kind === InvoiceLineKind.TAX) {
      taxMinor += lineTotal;
    } else if (line.kind === InvoiceLineKind.DISCOUNT) {
      // Reported as a positive magnitude so a UI can render "Discount 5.00"
      // rather than "Discount -5.00" alongside a subtraction.
      discountMinor += Math.abs(lineTotal);
    } else {
      subtotalMinor += lineTotal;
    }
  }

  return { subtotalMinor, discountMinor, taxMinor, totalMinor };
}
