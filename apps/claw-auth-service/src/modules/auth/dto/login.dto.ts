import { z } from 'zod';
import { VSCODE_SESSION_CLIENT, WEB_SESSION_CLIENT } from '../constants/token-session.constants';
import { SessionClientKind } from '../enums/session-client-kind.enum';
import type { SessionClient } from '../types/token-session.types';
import { botCheckSchema, deviceSchema } from '../../anti-abuse/dto/anti-abuse.dto';
import type { LoginScreeningInput } from '../../anti-abuse/types/device.types';

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').max(254),
    password: z.string().min(1, 'Password is required').max(1_024),
    clientKind: z.nativeEnum(SessionClientKind).optional(),
    clientName: z.string().trim().min(1).max(100).optional(),
    // "Remember me". Absent keeps the long session other clients always had.
    rememberMe: z.boolean().optional(),
    // Anti-abuse (2026-11-27): checks are required only after repeated failures;
    // the device is recorded on a successful sign-in.
    botCheck: botCheckSchema.optional(),
    device: deviceSchema.optional(),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;

/** The anti-abuse half of a login body, handed to AuthService as is. */
export function loginScreeningInput(dto: LoginDto): LoginScreeningInput {
  return { botCheck: dto.botCheck, device: dto.device };
}

export function loginSessionClient(dto: LoginDto): SessionClient {
  const fallback =
    dto.clientKind === SessionClientKind.VSCODE ? VSCODE_SESSION_CLIENT : WEB_SESSION_CLIENT;
  return {
    kind: dto.clientKind ?? fallback.kind,
    name: dto.clientName ?? fallback.name,
    persistent: dto.rememberMe ?? true,
  };
}
