import { formatMinorUnits } from '@claw/shared-utilities';
import { PageSizes, PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';

import {
  INVOICE_PDF_AMOUNT_X,
  INVOICE_PDF_LABEL_X,
  INVOICE_PDF_PAGE_MARGIN,
  INVOICE_PDF_PAGE_TOP,
  INVOICE_PDF_ROW_HEIGHT,
} from '../constants/invoice-pdf.constants';
import { type InvoicePdfInput, type InvoicePdfLine } from '../types/invoice-pdf.types';

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number): void {
  page.drawText(text, { x, y, size: 10, font, color: rgb(0.16, 0.18, 0.22) });
}

function drawLine(
  page: PDFPage,
  font: PDFFont,
  line: InvoicePdfLine,
  currency: string,
  y: number,
): void {
  const quantity = line.quantity === 1 ? '' : ` x ${String(line.quantity)}`;
  drawText(page, font, `${line.description}${quantity}`, INVOICE_PDF_LABEL_X, y);
  drawText(
    page,
    font,
    `${currency} ${formatMinorUnits(line.amountMinor * line.quantity, currency)}`,
    INVOICE_PDF_AMOUNT_X,
    y,
  );
}

function drawMoneyRow(
  page: PDFPage,
  font: PDFFont,
  label: string,
  amountMinor: number,
  currency: string,
  y: number,
): void {
  drawText(page, font, label, 340, y);
  drawText(
    page,
    font,
    `${currency} ${formatMinorUnits(amountMinor, currency)}`,
    INVOICE_PDF_AMOUNT_X,
    y,
  );
}

function formatPeriod(date: Date | null): string {
  return date?.toISOString().slice(0, 10) ?? '—';
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`ClawAI invoice ${input.number}`);
  document.setAuthor('ClawAI');
  document.setSubject('Subscription invoice');
  document.setCreationDate(input.issuedAt);
  document.setModificationDate(input.issuedAt);

  const page = document.addPage(PageSizes.A4);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  page.drawText('ClawAI', {
    x: INVOICE_PDF_PAGE_MARGIN,
    y: INVOICE_PDF_PAGE_TOP,
    size: 24,
    font: bold,
    color: rgb(0.12, 0.22, 0.45),
  });
  page.drawText('INVOICE', { x: 430, y: INVOICE_PDF_PAGE_TOP, size: 18, font: bold });
  drawText(page, font, `Invoice ${input.number}`, INVOICE_PDF_PAGE_MARGIN, 748);
  drawText(page, font, `Issued ${formatPeriod(input.issuedAt)}`, INVOICE_PDF_PAGE_MARGIN, 730);
  drawText(page, font, `Status ${input.status}`, 340, 748);
  drawText(
    page,
    font,
    `Period ${formatPeriod(input.periodStart)} to ${formatPeriod(input.periodEnd)}`,
    340,
    730,
  );

  page.drawLine({
    start: { x: INVOICE_PDF_PAGE_MARGIN, y: 700 },
    end: { x: 547, y: 700 },
    thickness: 1,
    color: rgb(0.78, 0.8, 0.84),
  });
  page.drawText('Description', { x: INVOICE_PDF_LABEL_X, y: 680, size: 10, font: bold });
  page.drawText('Amount', { x: INVOICE_PDF_AMOUNT_X, y: 680, size: 10, font: bold });

  const sortedLines = [...input.lines].sort((left, right) => left.sortOrder - right.sortOrder);
  for (const [index, line] of sortedLines.entries()) {
    drawLine(page, font, line, input.currency, 655 - index * INVOICE_PDF_ROW_HEIGHT);
  }

  const totalsY = Math.max(270, 625 - sortedLines.length * INVOICE_PDF_ROW_HEIGHT);
  drawMoneyRow(page, font, 'Subtotal', input.subtotalMinor, input.currency, totalsY);
  drawMoneyRow(
    page,
    font,
    'Discount',
    -input.discountMinor,
    input.currency,
    totalsY - INVOICE_PDF_ROW_HEIGHT,
  );
  drawMoneyRow(
    page,
    font,
    'Tax',
    input.taxMinor,
    input.currency,
    totalsY - INVOICE_PDF_ROW_HEIGHT * 2,
  );
  drawMoneyRow(
    page,
    bold,
    'Total',
    input.totalMinor,
    input.currency,
    totalsY - INVOICE_PDF_ROW_HEIGHT * 3,
  );
  drawMoneyRow(
    page,
    font,
    'Paid',
    input.amountPaidMinor,
    input.currency,
    totalsY - INVOICE_PDF_ROW_HEIGHT * 4,
  );
  drawMoneyRow(
    page,
    font,
    'Refunded',
    input.amountRefundedMinor,
    input.currency,
    totalsY - INVOICE_PDF_ROW_HEIGHT * 5,
  );

  drawText(page, font, 'Thank you for using ClawAI.', INVOICE_PDF_PAGE_MARGIN, 70);
  return document.save({ useObjectStreams: false });
}
