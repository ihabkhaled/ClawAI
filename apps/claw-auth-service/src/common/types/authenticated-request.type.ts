import { type Request } from 'express';
import { type UserRole } from '../enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
