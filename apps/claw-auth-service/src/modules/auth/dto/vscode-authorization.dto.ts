import { z } from 'zod';

export const vscodeAuthorizationInitSchema = z
  .object({
    callbackUri: z.string().url().max(2_000),
    state: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/u),
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    clientName: z.string().trim().min(1).max(100),
  })
  .strict();

export const vscodeAuthorizationRequestSchema = z
  .object({
    requestId: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/u),
  })
  .strict();

export const vscodeAuthorizationExchangeSchema = z
  .object({
    code: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/u),
    codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/u),
  })
  .strict();

export const vscodeAuthorizationCodeRecordSchema = z
  .object({
    clientName: z.string().trim().min(1).max(100),
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    userId: z.string().min(1),
  })
  .strict();

export type VscodeAuthorizationInitDto = z.infer<typeof vscodeAuthorizationInitSchema>;
export type VscodeAuthorizationRequestDto = z.infer<typeof vscodeAuthorizationRequestSchema>;
export type VscodeAuthorizationExchangeDto = z.infer<typeof vscodeAuthorizationExchangeSchema>;
