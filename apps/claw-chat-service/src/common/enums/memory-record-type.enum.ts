/**
 * The memory kinds this service distinguishes when building a prompt.
 *
 * Mirrors memory-service's `MemoryType`. Redeclared rather than imported
 * because that enum belongs to another service's Prisma client, and a service
 * boundary is not a place to share a generated type.
 *
 * The distinction that matters here is standing versus topical: an INSTRUCTION
 * or a PREFERENCE applies to every turn, while a FACT or a SUMMARY is relevant
 * only when the question is about it.
 */
export enum MemoryRecordType {
  SUMMARY = 'SUMMARY',
  FACT = 'FACT',
  PREFERENCE = 'PREFERENCE',
  INSTRUCTION = 'INSTRUCTION',
}
