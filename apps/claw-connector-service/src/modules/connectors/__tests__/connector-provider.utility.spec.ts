import { ConnectorProvider } from '../../../generated/prisma';
import { isConnectorProvider } from '../utilities/connector-provider.utility';

describe('isConnectorProvider', () => {
  it('accepts every provider the schema declares', () => {
    for (const provider of Object.values(ConnectorProvider)) {
      expect(isConnectorProvider(provider)).toBe(true);
    }
  });

  it('rejects the routing sentinel that used to reach Prisma', () => {
    // "AUTO" arrived here for every auto-routed Runtime V2 run and produced a
    // PrismaClientValidationError that escaped as a 500.
    expect(isConnectorProvider('AUTO')).toBe(false);
  });

  it('rejects unknown and mis-cased provider names', () => {
    expect(isConnectorProvider('openai')).toBe(false);
    expect(isConnectorProvider('')).toBe(false);
    expect(isConnectorProvider('NOT_A_PROVIDER')).toBe(false);
  });
});
