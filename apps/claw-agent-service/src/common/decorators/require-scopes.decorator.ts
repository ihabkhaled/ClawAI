import { SetMetadata } from '@nestjs/common';
import type { AgentScope } from '../types/auth.types';

export const REQUIRE_SCOPES_METADATA_KEY = 'agent:requireScopes';

export const RequireScopes = (...scopes: AgentScope[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_SCOPES_METADATA_KEY, scopes);
