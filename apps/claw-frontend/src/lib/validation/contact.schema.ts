import { z } from 'zod';

// The frontend enforces a strict CSP without `unsafe-eval`. Zod's JIT capability
// probe otherwise calls `Function("")` during hydration, which the browser
// correctly reports as a CSP violation even though Zod catches the exception.
z.config({ jitless: true });

// Shared by the client form (react-hook-form resolver) AND the server route,
// so validation can never diverge. Every string is length-capped. `company`
// is a honeypot: a real user never sees or fills it, so any value means a bot.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(10).max(5000),
  // Honeypot — a real user never fills this. Accepted at the schema level (so a
  // bot gets a normal 200, not a validation error that reveals the trap) and
  // rejected downstream in processContactSubmission. Length-capped to avoid abuse.
  company: z.string().max(200).optional(),
  // Anti-CSRF-ish timing guard: ms since the form mounted. Submissions faster
  // than the server threshold are treated as bot traffic. Optional/best-effort.
  elapsedMs: z.number().int().nonnegative().max(86_400_000).optional(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
