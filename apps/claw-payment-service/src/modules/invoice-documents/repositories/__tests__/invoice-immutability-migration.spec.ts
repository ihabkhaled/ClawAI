import { readFile } from 'node:fs/promises';

describe('invoice delivery migration', () => {
  it('enforces immutable issued invoices and lines in PostgreSQL', async () => {
    const sql = await readFile(
      'prisma/migrations/20260727050000_add_invoice_delivery/migration.sql',
      'utf8',
    );

    expect(sql).toContain('CREATE TABLE "invoice_deliveries"');
    expect(sql).toContain('prevent_issued_invoice_mutation');
    expect(sql).toContain('prevent_invoice_line_mutation');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON "invoice_lines"');
    expect(sql).toContain('BEFORE DELETE ON "invoices"');
  });
});
