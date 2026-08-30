/**
 * How long one extraction call may take.
 *
 * Extraction is unattended background enrichment — nobody is waiting for it —
 * so a long timeout looks harmless. It is not: the call runs once per message,
 * and measured at sixteen concurrent generations, sixteen ten-second calls in
 * flight starved memory RETRIEVAL into its own five-second timeout. The circuit
 * breaker is the real fix; this constant exists so the number is named rather
 * than inlined, and so it can be lowered without hunting for it.
 */
export const MEMORY_EXTRACTION_TIMEOUT_MS = 10_000;
