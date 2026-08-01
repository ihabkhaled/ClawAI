import { z } from 'zod';
import { VSCODE_SESSION_CLIENT, WEB_SESSION_CLIENT } from '../constants/token-session.constants';
import { SessionClientKind } from '../enums/session-client-kind.enum';
import type { SessionClient } from '../types/token-session.types';

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').max(254),
    password: z.string().min(1, 'Password is required').max(1_024),
    clientKind: z.nativeEnum(SessionClientKind).optional(),
    clientName: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;

export function loginSessionClient(dto: LoginDto): SessionClient {
  const fallback =
    dto.clientKind === SessionClientKind.VSCODE ? VSCODE_SESSION_CLIENT : WEB_SESSION_CLIENT;
  return {
    kind: dto.clientKind ?? fallback.kind,
    name: dto.clientName ?? fallback.name,
  };
}
