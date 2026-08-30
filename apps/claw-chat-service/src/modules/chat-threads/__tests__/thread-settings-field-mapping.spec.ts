import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the gap that swallowed `useCrossThreadContext` on its first live run.
 *
 * `ChatThreadsService` maps DTO fields to repository fields one line at a time.
 * That is a reasonable design — it is where ownership and cross-field rules are
 * enforced — but it means adding a field to the DTO does nothing until somebody
 * remembers this file too. The toggle returned `200 OK`, the column kept its
 * default, and the feature behind it looked broken rather than unwired. Nothing
 * in the type system catches it: every field is optional, so an object missing
 * one is still a valid object.
 *
 * A source-text check on purpose. A behavioural test would need one case per
 * field and would be forgotten in exactly the same way the mapping was.
 */

const MODULE_ROOT = join(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(join(MODULE_ROOT, relativePath), 'utf8');
}

/** Field names declared in a zod object schema, in declaration order. */
function schemaFields(source: string, schemaName: string): string[] {
  const start = source.indexOf(`export const ${schemaName} =`);
  if (start < 0) throw new Error(`schema ${schemaName} not found`);
  const body = source.slice(start, source.indexOf('export type', start));
  return [...body.matchAll(/^\s{2,4}(\w+):\s*z\./gm)].map((match) => match[1] ?? '');
}

/**
 * The source of ONE method.
 *
 * Scoping matters, and this is not hypothetical: the first version of this test
 * searched the whole file, so a field mapped correctly on update made a missing
 * mapping on create look present, and the test passed over the very bug it was
 * written for.
 */
function methodSource(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`method ${signature} not found`);
  const next = source.indexOf('\n  async ', start + signature.length);
  return source.slice(start, next < 0 ? source.length : next);
}

/**
 * Fields the service is allowed not to forward, each for a stated reason.
 * Adding to this list is a deliberate act; forgetting a field is not.
 */
const NOT_FORWARDED: Readonly<Record<string, string>> = Object.freeze({});

describe('thread settings reach the database', () => {
  const serviceSource = read('services/chat-threads.service.ts');

  it('forwards every field of createThreadSchema', () => {
    const fields = schemaFields(read('dto/create-thread.dto.ts'), 'createThreadSchema');
    expect(fields.length).toBeGreaterThan(5);
    const body = methodSource(serviceSource, 'async createThread(');

    const missing = fields.filter(
      (field) => NOT_FORWARDED[field] === undefined && !body.includes(`${field}: dto.${field}`),
    );

    expect(missing).toEqual([]);
  });

  it('forwards every field of updateThreadSchema', () => {
    const fields = schemaFields(read('dto/update-thread.dto.ts'), 'updateThreadSchema');
    expect(fields.length).toBeGreaterThan(10);
    const body = methodSource(serviceSource, 'async updateThread(');

    const missing = fields.filter((field) => {
      if (NOT_FORWARDED[field] !== undefined) return false;
      // `criticEnabled` and `criticModel` reach the write through a conditional
      // expression rather than a direct assignment, because they are forced off
      // when the judge is off. Naming the field at all is what this asserts.
      return !new RegExp(`\\b${field}:`).test(body);
    });

    expect(missing).toEqual([]);
  });

  it('names the cross-thread toggle on both writes', () => {
    // The specific instance, kept beside the general rule so a regression reads
    // as "cross-thread retrieval stopped persisting" rather than as an abstract
    // field-count mismatch.
    const occurrences =
      serviceSource.split('useCrossThreadContext: dto.useCrossThreadContext').length - 1;
    expect(occurrences).toBe(2);
  });
});
