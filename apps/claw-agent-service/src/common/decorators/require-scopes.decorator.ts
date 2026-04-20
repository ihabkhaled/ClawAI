import { SetMetadata } from '@nestjs/common';
import type { DeviceScope } from '../enums/device-scope.enum';

export const REQUIRE_SCOPES_METADATA_KEY = 'agent:requireScopes';

export const RequireScopes = (...scopes: DeviceScope[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_SCOPES_METADATA_KEY, scopes);
