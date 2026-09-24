import { ConnectorAuthType as PresetAuthType } from '@claw/shared-types';

import { ConnectorAuthType } from '@/enums';

/**
 * The frontend `ConnectorAuthType` enum and `@claw/shared-types`' one carry
 * the same string values but are distinct nominal enum types, so a preset's
 * auth type is mapped explicitly rather than cast.
 */
export function toFrontendConnectorAuthType(authType: PresetAuthType): ConnectorAuthType {
  switch (authType) {
    case PresetAuthType.OAUTH2:
      return ConnectorAuthType.OAUTH2;
    case PresetAuthType.NONE:
      return ConnectorAuthType.NONE;
    case PresetAuthType.API_KEY:
    default:
      return ConnectorAuthType.API_KEY;
  }
}
