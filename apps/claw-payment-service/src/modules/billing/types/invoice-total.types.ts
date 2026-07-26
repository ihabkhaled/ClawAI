/**
 * Derived invoice header totals, all integer minor units.
 *
 * `discountMinor` is a positive magnitude for display; its effect is already
 * included (negatively) in `totalMinor`.
 */
export type InvoiceTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};
