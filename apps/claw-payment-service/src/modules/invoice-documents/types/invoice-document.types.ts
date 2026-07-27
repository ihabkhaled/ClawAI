import { type Prisma } from '../../../generated/prisma';

export type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true };
}>;

export type InvoiceDeliveryCandidate = Prisma.InvoiceDeliveryGetPayload<{
  include: { invoice: { select: { number: true } } };
}>;

export type RenderedInvoiceDocument = {
  bytes: Uint8Array;
  filename: string;
};
